import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orderSubmissions } from "@/db/schema";

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
  try {
    const body = await req.json();
    if (body && typeof body.action === "string") action = body.action;
  } catch {
    /* fara corp = publish, compatibil cu ce exista */
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
  if (row.paymentMethod === "op" && row.status === "pending_payment") {
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
