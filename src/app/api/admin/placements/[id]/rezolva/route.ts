import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orderSubmissions, placements, publishers } from "@/db/schema";
import { ensureOrderColumns, ensurePlacementTables } from "@/lib/ensure-columns";
import { inlocuiestePlasare } from "@/lib/termene-parteneri";
import { NEWSPAPERS } from "@/data/newspapers";
import { semneazaToken } from "@/lib/plasare-token";
import { sendEmail, wrapEmail, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("partener"), publisherId: z.string().min(1) }),
  z.object({ action: z.literal("retea"), ziar: z.string().min(1), url: z.string().url().max(500) }),
  z.object({ action: z.literal("ramburs") }),
]);

/**
 * Rezolvarea unei plasari cazute fara inlocuitor automat (29.09.2026):
 *   - alt partener, ales de admin (poate fi si mai scump);
 *   - un ziar din reteaua noastra (publicat manual; aici se trece linkul);
 *   - banii inapoi (returnarea se face din Stripe).
 * `replacedById` tine minte rezolvarea: id-ul plasarii noi, „retea|ziar|url"
 * sau „ramburs".
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });
  let d: z.infer<typeof schema>;
  try {
    d = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Date invalide." }, { status: 400 });
  }
  await Promise.all([ensureOrderColumns(), ensurePlacementTables()]);
  const [pl] = await db.select().from(placements).where(eq(placements.id, params.id)).limit(1);
  if (!pl) return NextResponse.json({ ok: false, error: "Nu există." }, { status: 404 });
  if (pl.replacedById) return NextResponse.json({ ok: false, error: "E deja rezolvată." }, { status: 409 });
  if (!["expirat", "refuzat", "anulat"].includes(pl.status)) {
    return NextResponse.json({ ok: false, error: "Plasarea e încă activă la partener." }, { status: 409 });
  }

  if (d.action === "partener") {
    const [pub] = await db.select().from(publishers).where(eq(publishers.id, d.publisherId)).limit(1);
    if (!pub || pub.status !== "approved" || !pub.pricePerArticle) {
      return NextResponse.json({ ok: false, error: "Partenerul nu e activ sau nu are tarif." }, { status: 409 });
    }
    const r = await inlocuiestePlasare(pl, "mutat de admin", pub);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "Trimiterea a eșuat." }, { status: 500 });
  }

  const [cmd] = pl.orderSubmissionId
    ? await db.select().from(orderSubmissions).where(eq(orderSubmissions.id, pl.orderSubmissionId)).limit(1)
    : [];
  const pagina = cmd ? `${SITE.url}/comanda-mea/${semneazaToken({ scope: "client", id: cmd.id, v: 0 })}` : SITE.url;

  if (d.action === "retea") {
    if (!NEWSPAPERS.some((n) => n.name === d.ziar)) {
      return NextResponse.json({ ok: false, error: "Ziarul nu e din rețea." }, { status: 400 });
    }
    await db.update(placements).set({ replacedById: `retea|${d.ziar}|${d.url}` }).where(eq(placements.id, pl.id));
    if (cmd?.email) {
      await sendEmail({
        to: cmd.email,
        subject: `Articolul tău a apărut pe ${d.ziar}`,
        html: wrapEmail(
          "Articolul tău a apărut",
          `<p>Bună ziua,</p>
           <p>În locul publicației care nu a putut prelua articolul, <strong>„${esc(pl.articleTitle)}"</strong> a apărut pe <strong>${esc(d.ziar)}</strong>, din rețeaua noastră, fără cost pentru tine:</p>
           <p style="margin:18px 0;"><a href="${esc(d.url)}" style="background:#C8102E;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Vezi articolul</a></p>
           <p style="font-size:13px;"><a href="${pagina}">Pagina comenzii tale</a></p>`,
        ),
        replyTo: ADMIN_EMAIL,
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  await db.update(placements).set({ replacedById: "ramburs" }).where(eq(placements.id, pl.id));
  if (cmd?.email) {
    await sendEmail({
      to: cmd.email,
      subject: `Îți returnăm ${pl.priceClient} lei`,
      html: wrapEmail(
        "Returnare",
        `<p>Bună ziua,</p>
         <p>Publicația aleasă nu a putut prelua articolul <strong>„${esc(pl.articleTitle)}"</strong> și nu am găsit una echivalentă, așa că îți returnăm <strong>${pl.priceClient} lei</strong> pe cardul cu care ai plătit. Banii apar în câteva zile lucrătoare, în funcție de bancă.</p>
         <p style="font-size:13px;"><a href="${pagina}">Pagina comenzii tale</a></p>`,
      ),
      replyTo: ADMIN_EMAIL,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true, deReturnat: pl.priceClient, stripe: cmd?.stripeSessionId || null });
}
