import { NextRequest, NextResponse } from "next/server";
import { desc, gte } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderSubmissions } from "@/db/schema";
import { verifyExtensionKey } from "@/lib/extension-auth";
import { etichetaSursa, paginaDeIntrare } from "@/lib/sursa";
import { findPackageById } from "@/data/packages";
import { ensureOrderColumns } from "@/lib/ensure-columns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 13.11.2026 — comenzile, DOAR CITIRE, cu aceeasi cheie ca extensia
 * (X-Api-Key), ca asistentul sa poata raspunde „de unde au venit clientii?"
 * fara cookie de admin. Fara date de plata, fara adrese, fara telefoane.
 * ?zile=60 (max 365).
 */
export async function GET(req: NextRequest) {
  const eroare = verifyExtensionKey(req);
  if (eroare) return eroare;
  await ensureOrderColumns();
  const zile = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("zile") || "60", 10) || 60, 1), 365);
  const de = new Date(Date.now() - zile * 86400000);

  const materiale = await db
    .select({
      id: orderSubmissions.id,
      creat: orderSubmissions.createdAt,
      firma: orderSubmissions.companyName,
      email: orderSubmissions.email,
      pachet: orderSubmissions.packageId,
      plata: orderSubmissions.paymentMethod,
      stare: orderSubmissions.status,
      sursa: orderSubmissions.source,
    })
    .from(orderSubmissions)
    .where(gte(orderSubmissions.createdAt, de))
    .orderBy(desc(orderSubmissions.createdAt));

  const card = await db
    .select({
      id: orders.id,
      creat: orders.createdAt,
      email: orders.email,
      pachet: orders.packageId,
      suma: orders.amount,
      stare: orders.status,
      sursa: orders.source,
    })
    .from(orders)
    .where(gte(orders.createdAt, de))
    .orderBy(desc(orders.createdAt));

  const fmt = (s: string | null) => ({ sursa: etichetaSursa(s), a_intrat_pe: paginaDeIntrare(s) || null, sursa_bruta: s });
  return NextResponse.json({
    ok: true,
    zile,
    materiale: materiale.map((m) => ({ ...m, pachet: findPackageById(m.pachet || "")?.name || m.pachet, ...fmt(m.sursa) })),
    plati_card: card.map((c) => ({ ...c, suma_lei: Math.round(Number(c.suma || 0)) / 100, pachet: findPackageById(c.pachet || "")?.name || c.pachet, ...fmt(c.sursa) })),
  });
}
