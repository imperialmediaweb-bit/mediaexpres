import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orderSubmissions } from "@/db/schema";
import { trimiteAutomatInRetea } from "@/lib/retea";
import { sendCapiEvent } from "@/lib/meta-capi";
import { findPackageById } from "@/data/packages";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  // Doua actiuni pe aceeasi ruta: confirmarea incasarii si publicarea.
  // Corpul e optional ca apelurile vechi (fara body = publish) sa mearga la fel.
  let action = "publish";
  let siteNou = "";
  try {
    const body = await req.json();
    if (body && typeof body.action === "string") action = body.action;
    if (body && typeof body.siteUrl === "string") siteNou = body.siteUrl.trim();
  } catch {
    /* fara corp = publish, compatibil cu ce exista */
  }

  // 13.11.2026 — clientul fără site: adminul pune linkul lui (pagina de
  // Facebook, Google Maps…), ca rețeaua să poată primi comanda.
  if (action === "site") {
    if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(siteNou)) {
      return NextResponse.json({ ok: false, error: "Linkul trebuie să înceapă cu https://" }, { status: 400 });
    }
    const [updated] = await db
      .update(orderSubmissions)
      .set({ siteUrl: siteNou })
      .where(eq(orderSubmissions.id, params.id))
      .returning({ id: orderSubmissions.id });
    if (!updated) return NextResponse.json({ ok: false, error: "Nu există" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (action === "confirm_payment") {
    // "paid" exista doar intre pending_payment si published: banii au intrat,
    // articolul inca nu e pe site. Fara starea asta, adminul nu avea unde sa
    // noteze ca a verificat extrasul, iar publicarea unei comenzi neincasate
    // era la un singur click distanta.
    const [updated] = await db
      .update(orderSubmissions)
      .set({ status: "paid" })
      .where(eq(orderSubmissions.id, params.id))
      .returning({ id: orderSubmissions.id });
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Nu există" }, { status: 404 });
    }
    // 04.10.2026 — banii au intrat: comanda pleaca in retea (lib/retea.ts).
    await trimiteAutomatInRetea(params.id, "plata OP confirmata");
    // 13.11.2026 — Purchase si pentru OP (Conversions API). Pana azi Meta vedea
    // doar platile cu cardul (3 din 14 comenzi in 30 de zile), deci reclamele
    // optimizate pe vanzari invatau din prea putine comenzi. event_id = "op_<id>":
    // o a doua confirmare a aceleiasi comenzi e deduplicata de Meta.
    try {
      const [c] = await db
        .select({
          email: orderSubmissions.email,
          phone: orderSubmissions.contactPhone,
          packageId: orderSubmissions.packageId,
        })
        .from(orderSubmissions)
        .where(eq(orderSubmissions.id, params.id))
        .limit(1);
      const pachet = c ? findPackageById(c.packageId) : undefined;
      if (c && pachet) {
        await sendCapiEvent({
          eventName: "Purchase",
          eventId: `op_${params.id}`,
          eventSourceUrl: "https://mediaexpress.ro/comanda",
          value: pachet.price,
          currency: "RON",
          user: { email: c.email || undefined, phone: c.phone || undefined },
          customData: { content_name: c.packageId, content_category: "package", payment: "op" },
        });
      }
    } catch (err) {
      console.error("[confirm_payment] capi purchase:", err);
    }
    return NextResponse.json({ ok: true });
  }

  if (action !== "publish") {
    return NextResponse.json({ ok: false, error: "Acțiune necunoscută" }, { status: 400 });
  }

  // Gardul de pe server, nu doar din UI: o comanda OP neconfirmata nu se
  // poate publica nici cu un fetch scris de mana.
  const [row] = await db
    .select({ status: orderSubmissions.status, paymentMethod: orderSubmissions.paymentMethod })
    .from(orderSubmissions)
    .where(eq(orderSubmissions.id, params.id))
    .limit(1);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Nu există" }, { status: 404 });
  }
  if (row.status === "pending_payment") {
    return NextResponse.json(
      { ok: false, error: "Comanda nu e încasată. Confirmă întâi plata (după ce o vezi în extras)." },
      { status: 409 },
    );
  }

  const [updated] = await db
    .update(orderSubmissions)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(orderSubmissions.id, params.id))
    .returning({ id: orderSubmissions.id });
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Nu există" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
