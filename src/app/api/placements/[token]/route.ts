import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { placements, publishers } from "@/db/schema";
import { ensurePlacementTables } from "@/lib/ensure-columns";
import { verificaToken } from "@/lib/plasare-token";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { onlinePanaLa, tranzitiePermisa, type StarePlasare } from "@/lib/plasari";

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

  if (d.action === "publicat") {
    if (!d.url) {
      return NextResponse.json({ ok: false, error: "Lipsește adresa articolului." }, { status: 400 });
    }
    await db
      .update(placements)
      .set({
        status: "publicat",
        publishedUrl: d.url,
        publishedAt: acum,
        onlineUntil: onlinePanaLa(acum),
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
        ${d.action === "refuz" ? kv("Motiv", esc(d.reason || "nu a dat")) : ""}
        ${kv("Îi plătim", `${pl.pricePartner} lei`)}
      </table>`,
    ),
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
