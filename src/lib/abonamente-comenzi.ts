import type Stripe from "stripe";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { signOrderToken } from "@/lib/order-token";
import { sendEmail, wrapEmail, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";

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
    if (await inregistreazaComandaAbonament(s, email, null)) {
      adaugate++;
      // Recuperat = clientul a asteptat deja: primeste formularul ACUM, nu
      // la urmatoarea trecere a cronului.
      if (email) await trimiteFormularul(s, email);
    }
  }
  return adaugate;
}

async function trimiteFormularul(s: Stripe.Checkout.Session, email: string) {
  const packageId = (s.metadata?.planId as string) || "promo-lunar";
  const link = `${SITE.url}/articol/${signOrderToken({ sessionId: s.id, email, packageId })}`;
  const nume = s.customer_details?.name?.split(" ")[0];
  const ok = await sendEmail({
    to: email,
    subject: "Trimite-ne articolul pentru abonament — MediaExpres",
    html: wrapEmail(
      "Mai e un singur pas",
      `<p>Bună ziua${nume ? " " + nume : ""},</p>
       <p>Mulțumim pentru abonament! Ca să publicăm primul articol pe cele 50 de ziare, avem nevoie de materiale: textul (sau doar tema și site-ul firmei, îl scriem noi), până la 3 poze, linkurile dorite și datele firmei pentru factură.</p>
       <p style="margin:18px 0;"><a href="${link}" style="background:#c1121f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Trimite articolul →</a></p>
       <p style="color:#64748b;font-size:13px;">Durează 2 minute. Publicăm în maximum 12 ore lucrătoare de la primire și îți trimitem raportul cu toate linkurile. În fiecare lună nouă primești automat un link nou, pentru articolul lunii.</p>
       <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa ${SITE.name}</strong></p>`,
    ),
    replyTo: ADMIN_EMAIL,
  })
    .then(() => true)
    .catch((e) => {
      console.error("[abonamente] email formular:", e);
      return false;
    });
  if (ok) {
    await db.update(orders).set({ materialReminderAt: new Date() }).where(eq(orders.stripeSessionId, s.id));
  }
}
