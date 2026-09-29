import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { partnerPayouts, placements, publishers } from "@/db/schema";
import { ensurePlacementTables } from "@/lib/ensure-columns";
import { sendEmail, wrapEmail, escapeHtml as esc } from "@/lib/email";

export const runtime = "nodejs";

const schema = z.object({ action: z.enum(["platit", "anulat"]) });

/**
 * „Am platit" / „Anuleaza" pe o cerere de plata a unui partener.
 *
 * 29.09.2026 — „Am platit" se apasa DUPA ce banii au plecat din banca: de
 * aici pleaca emailul catre partener. „Anuleaza" elibereaza plasarile, care
 * revin in soldul lui si pot fi cerute din nou.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Acțiune invalidă" }, { status: 400 });

  await ensurePlacementTables();
  const acum = new Date();
  // Conditionat pe „cerut": un dublu click nu plateste si nu anuleaza de doua ori.
  const [c] = await db
    .update(partnerPayouts)
    .set(parsed.data.action === "platit" ? { status: "platit", paidAt: acum } : { status: "anulat", cancelledAt: acum })
    .where(and(eq(partnerPayouts.id, params.id), eq(partnerPayouts.status, "cerut")))
    .returning();
  if (!c) return NextResponse.json({ ok: false, error: "Cererea nu mai e deschisă." }, { status: 409 });

  if (parsed.data.action === "anulat") {
    await db.update(placements).set({ statementId: null }).where(eq(placements.statementId, c.id));
    return NextResponse.json({ ok: true });
  }

  const [pub] = await db.select().from(publishers).where(eq(publishers.id, c.publisherId)).limit(1);
  if (pub) {
    await sendEmail({
      to: pub.contactEmail,
      subject: `Ți-am plătit ${c.amount} lei`,
      html: wrapEmail(
        "Plata a fost trimisă",
        `<p>Salut,</p>
         <p>Am trimis <strong>${c.amount} lei</strong> în contul ${esc(c.iban)}, pentru ${c.placementsCount} articole publicate pe ${esc(pub.siteName)}.</p>
         <p>Mulțumim că lucrezi cu noi.</p>`,
      ),
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
