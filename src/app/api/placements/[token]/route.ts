import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions, placements, publishers } from "@/db/schema";
import { SITE } from "@/data/site";
import { ensurePlacementTables } from "@/lib/ensure-columns";
import { verificaToken, semneazaToken } from "@/lib/plasare-token";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { onlinePanaLa, tranzitiePermisa, type StarePlasare } from "@/lib/plasari";
import { eBlocant, ETICHETE_LINK, type StareLink } from "@/lib/paza-linkuri";
import { verificaPlasare } from "@/lib/ruleaza-paza";

export const runtime = "nodejs";

const schema = z.object({
  action: z.enum(["accept", "refuz", "publicat"]),
  reason: z.string().max(500).optional(),
  url: z.string().url().max(500).optional(),
});

/**
 * Ce apasa publicatia partenera in pagina ei: accept, refuz, sau lipirea
 * adresei articolului publicat.
 *
 * Tranzitiile se verifica AICI, nu in interfata: pagina poate fi deschisa de
 * ieri, iar un refuz trimis dupa termen n-are voie sa treaca doar fiindca
 * browserul nu stia ca termenul a trecut.
 */
export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const t = verificaToken(params.token, "plasare");
  if (!t) {
    return NextResponse.json({ ok: false, error: "Link expirat sau invalid." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  }
  const d = parsed.data;

  await ensurePlacementTables();
  const [pl] = await db.select().from(placements).where(eq(placements.id, t.id)).limit(1);
  if (!pl) {
    return NextResponse.json({ ok: false, error: "Plasare inexistentă" }, { status: 404 });
  }
  if ((pl.tokenVersion ?? 0) !== t.v) {
    return NextResponse.json({ ok: false, error: "Link invalid." }, { status: 403 });
  }

  const acum = new Date();
  const tinta: StarePlasare = d.action === "accept" ? "acceptat" : d.action === "refuz" ? "refuzat" : "publicat";
  if (!tranzitiePermisa(pl.status, tinta)) {
    return NextResponse.json(
      { ok: false, error: `Articolul e deja „${pl.status}", nu mai poate fi schimbat.` },
      { status: 409 },
    );
  }

  if (d.action === "refuz" && acum > new Date(pl.deadlineRefuz)) {
    // Decizia comerciala, scrisa in cod: dupa termen refuzul nu mai e al lui.
    return NextResponse.json(
      { ok: false, error: "Termenul de refuz a trecut. Scrie-ne și rezolvăm împreună." },
      { status: 409 },
    );
  }

  let verificare: { stare: string; detalii: string } | null = null;
  if (d.action === "publicat") {
    if (!d.url) {
      return NextResponse.json({ ok: false, error: "Lipsește adresa articolului." }, { status: 400 });
    }
    /**
     * 29.09.2026 — verificam pagina pe loc, inainte sa anuntam clientul:
     * exista, are linkul catre el, nu e nofollow/noindex. Daca nu, partenerul
     * afla ACUM ce lipseste. Daca insista cu aceeasi adresa (verificarea
     * noastra poate gresi — site cu JavaScript, bot blocat), o primim si o
     * verifica un om: paza linkurilor o prinde oricum la urmatoarea trecere.
     */
    const [pubV] = await db.select().from(publishers).where(eq(publishers.id, pl.publisherId)).limit(1);
    verificare = await verificaPlasare(pl, pubV, d.url);
    const respinsInainte = pl.linkDetail === `respins:${d.url}`;
    if (eBlocant(verificare.stare) && !respinsInainte) {
      await db.update(placements).set({ linkDetail: `respins:${d.url}` }).where(eq(placements.id, pl.id));
      return NextResponse.json(
        {
          ok: false,
          error: `${ETICHETE_LINK[verificare.stare as StareLink]} (${verificare.detalii}). Repară și trimite din nou. Dacă ești sigur că e corect, trimite din nou aceeași adresă și o verificăm noi.`,
        },
        { status: 422 },
      );
    }
    await db
      .update(placements)
      .set({
        status: "publicat",
        publishedUrl: d.url,
        publishedAt: acum,
        onlineUntil: onlinePanaLa(acum),
        linkStatus: verificare.stare,
        linkDetail: verificare.detalii,
        linkCheckedAt: acum,
        linkFailCount: verificare.stare === "ok" ? 0 : 1,
      })
      .where(eq(placements.id, pl.id));
  } else if (d.action === "accept") {
    await db.update(placements).set({ status: "acceptat", acceptedAt: acum }).where(eq(placements.id, pl.id));
  } else {
    await db
      .update(placements)
      .set({ status: "refuzat", refusedAt: acum, refusalReason: d.reason?.trim() || null })
      .where(eq(placements.id, pl.id));
  }

  const [pub] = await db.select().from(publishers).where(eq(publishers.id, pl.publisherId)).limit(1);
  const nume = pub?.siteName || pl.publisherId;
  await sendEmail({
    to: ADMIN_EMAIL,
    subject:
      d.action === "publicat"
        ? `✅ Publicat pe ${nume}`
        : d.action === "refuz"
          ? `❌ Refuzat de ${nume}`
          : `Acceptat de ${nume}`,
    html: wrapEmail(
      d.action === "publicat" ? "Articol publicat" : d.action === "refuz" ? "Articol refuzat" : "Articol acceptat",
      `<table style="width:100%;border-collapse:collapse;">
        ${kv("Publicație", esc(nume))}
        ${kv("Titlu", esc(pl.articleTitle))}
        ${d.action === "publicat" ? kv("Adresă", `<a href="${esc(d.url || "")}">${esc(d.url || "")}</a>`) : ""}
        ${verificare ? kv("Verificare link", `${verificare.stare === "ok" ? "✅" : "⚠️"} ${esc(ETICHETE_LINK[verificare.stare as StareLink] || verificare.stare)} — ${esc(verificare.detalii)}`) : ""}
        ${d.action === "refuz" ? kv("Motiv", esc(d.reason || "nu a dat")) : ""}
        ${kv("Îi plătim", `${pl.pricePartner} lei`)}
      </table>`,
    ),
  }).catch(() => {});

  // 29.09.2026 — clientul primeste linkul DE LA NOI, pe emailul MediaExpres,
  // nu de la partener: cei doi nu intra niciodata in contact direct.
  // Cu linkul inca stricat (partenerul a insistat), clientul NU e anuntat
  // pana nu confirma un om din admin sau pana nu trece paza linkurilor.
  if (d.action === "publicat" && pl.orderSubmissionId && d.url && !(verificare && eBlocant(verificare.stare))) {
    try {
      const [cmd] = await db
        .select({ id: orderSubmissions.id, email: orderSubmissions.email, title: orderSubmissions.title })
        .from(orderSubmissions)
        .where(eq(orderSubmissions.id, pl.orderSubmissionId))
        .limit(1);
      if (cmd?.email) {
        await sendEmail({
          to: cmd.email,
          subject: `Articolul tău a apărut pe ${nume}`,
          html: wrapEmail(
            "Articolul tău a apărut",
            `<p>Bună ziua,</p>
             <p>Articolul <strong>„${esc(cmd.title)}"</strong> a fost publicat pe <strong>${esc(nume)}</strong>:</p>
             <p style="margin:18px 0;"><a href="${esc(d.url)}" style="background:#C8102E;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Vezi articolul</a></p>
             <p style="color:#64748b;font-size:13px;">Rămâne online cel puțin 12 luni. La final primești raportul complet, cu toate linkurile.</p>
             <p style="font-size:13px;">Toate publicațiile comenzii și mesajele cu ele: <a href="${SITE.url}/comanda-mea/${semneazaToken({ scope: "client", id: cmd.id, v: 0 })}">pagina comenzii tale</a>.</p>
             <p style="margin-top:20px;">Cu respect,<br/><strong>Echipa ${SITE.name}</strong></p>`,
          ),
          replyTo: ADMIN_EMAIL,
        });
      }
    } catch (e) {
      console.error("[placements] email client:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
