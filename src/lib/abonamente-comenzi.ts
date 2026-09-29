import type Stripe from "stripe";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { getStripe } from "@/lib/stripe";

/**
 * 29.09.2026 — abonamentul intra si in `orders`, ca plata unica.
 *
 * Pana acum abonamentul traia doar in `subscriptions`: nu aparea in admin la
 * Comenzi / Materiale, iar cronul materiale-lipsa (care trimite clientului
 * formularul dupa 10 minute) nu-l vedea. Un client cu abonament a platit si a
 * ramas fara nicio cale spre formular, iar proprietarul nu-l vedea nicaieri.
 * Idempotent pe sesiunea Stripe.
 */
export async function inregistreazaComandaAbonament(
  session: Stripe.Checkout.Session,
  email: string | null,
  userId: string | null,
): Promise<boolean> {
  await ensureOrderColumns();
  const r = await db
    .insert(orders)
    .values({
      userId: userId || null,
      email: email || "",
      packageId: (session.metadata?.planId as string) || "promo-lunar",
      amount: session.amount_total || 0,
      currency: (session.currency || "ron").toLowerCase(),
      status: "paid",
      stripeSessionId: session.id,
      paidAt: new Date(session.created * 1000),
      createdAt: new Date(session.created * 1000),
      source: (session.metadata?.sursa as string) || null,
    })
    .onConflictDoNothing({ target: orders.stripeSessionId })
    .returning({ id: orders.id });
  return r.length > 0;
}

/**
 * Plasa de siguranta, din cronul de 5 minute: abonamentele platite in
 * ultimele 14 zile care nu au comanda (webhook picat sau dinainte de
 * reparatie) primesc comanda acum — si, prin ea, reamintirea cu formularul.
 */
export async function recupereazaAbonamente(): Promise<number> {
  const stripe = getStripe();
  if (!stripe) return 0;
  const deLa = Math.floor(Date.now() / 1000) - 14 * 86400;
  const lista = await stripe.checkout.sessions.list({ created: { gte: deLa }, limit: 50 });
  let adaugate = 0;
  for (const s of lista.data) {
    if (s.mode !== "subscription" || s.status !== "complete") continue;
    if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") continue;
    const email = s.customer_details?.email || s.customer_email || null;
    if (await inregistreazaComandaAbonament(s, email, null)) adaugate++;
  }
  return adaugate;
}
