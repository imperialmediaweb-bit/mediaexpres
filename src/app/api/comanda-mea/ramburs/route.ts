import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orderSubmissions, placements, publishers } from "@/db/schema";
import { ensurePlacementTables } from "@/lib/ensure-columns";
import { verificaToken } from "@/lib/plasare-token";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

const schema = z.object({ t: z.string().max(500), p: z.string().max(100) });

/**
 * „Prefer banii inapoi" (29.09.2026): doar pe o plasare INLOCUITOARE a
 * comenzii lui, inca nepublicata. Plasarea se anuleaza pe loc (partenerul nu
 * mai are voie sa publice), iar returnarea o face adminul din Stripe.
 */
export async function POST(req: NextRequest) {
  let d: z.infer<typeof schema>;
  try {
    d = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Date invalide." }, { status: 400 });
  }
  const t = verificaToken(d.t, "client");
  if (!t) return NextResponse.json({ ok: false, error: "Link expirat." }, { status: 403 });
  await ensurePlacementTables();

  const [pl] = await db
    .update(placements)
    .set({ status: "anulat", refundRequestedAt: new Date() })
    .where(
      and(
        eq(placements.id, d.p),
        eq(placements.orderSubmissionId, t.id),
        isNotNull(placements.replacesId),
        isNull(placements.refundRequestedAt),
        inArray(placements.status, ["trimis", "acceptat"]),
      ),
    )
    .returning();
  if (!pl) {
    return NextResponse.json(
      { ok: false, error: "Nu se mai poate: articolul e deja publicat sau cererea a fost trimisă." },
      { status: 409 },
    );
  }

  const [[pub], [cmd]] = await Promise.all([
    db.select().from(publishers).where(eq(publishers.id, pl.publisherId)).limit(1),
    db.select().from(orderSubmissions).where(eq(orderSubmissions.id, t.id)).limit(1),
  ]);
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `💸 Clientul vrea banii înapoi — ${pl.priceClient} lei`,
    html: wrapEmail(
      "Cerere de returnare",
      `<table style="width:100%;border-collapse:collapse;">
        ${kv("Client", esc(cmd?.email || "—"))}
        ${kv("Articol", esc(pl.articleTitle))}
        ${kv("Publicația anulată", esc(pub?.siteName || "—"))}
        ${kv("De returnat", `${pl.priceClient} lei`)}
      </table>
      <p>Plasarea e deja anulată. Fă returnarea parțială din Stripe (comanda ${esc(cmd?.stripeSessionId || "")}).</p>
      <p><a href="${SITE.url}/admin/plasari/${pl.id}">Deschide plasarea</a></p>`,
    ),
  }).catch(() => {});
  if (pub?.contactEmail) {
    await sendEmail({
      to: pub.contactEmail,
      subject: `Anulat: „${pl.articleTitle.slice(0, 60)}"`,
      html: wrapEmail("Articol anulat", `<p>Clientul a renunțat la articolul <strong>„${esc(pl.articleTitle)}"</strong>. Te rugăm să NU-l publici. Mulțumim!</p>`),
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
