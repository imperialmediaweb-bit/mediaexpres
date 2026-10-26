import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderSubmissions } from "@/db/schema";
import { getStripe } from "@/lib/stripe";
import { issueInvoiceForOrder } from "@/lib/invoicing";
import { sendEmail, wrapEmail, escapeHtml, ADMIN_EMAIL } from "@/lib/email";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { campaniaPentruComanda } from "@/lib/retea";

/**
 * 26.10.2026 — plata rezervata. Proprietarul: „clientul plateste, dar banii se
 * iau abia cand primeste linkul cu raportul; daca nu publicam in 72 de ore,
 * banii raman la el". Stripe: capture_method manual la checkout, capture la
 * trimiterea raportului, cancel daca trec 72 de ore.
 *
 * Ceasul de 72 de ore porneste cand avem materialele: cand comanda a plecat in
 * reteaua de publicare (retea_trimis_la) sau cand adminul a marcat materialul
 * primit pe alta cale. Fara materiale, rezervarea tine cat permite Stripe
 * (~7 zile) si se anuleaza la 6 zile, cu email catre client.
 */

const ORA = 60 * 60 * 1000;
const TERMEN_PUBLICARE = 72 * ORA;
const ALERTA_PUBLICARE = 48 * ORA;
const TERMEN_FARA_MATERIALE = 6 * 24 * ORA;
const ALERTA_FARA_MATERIALE = 5 * 24 * ORA;

type DateFactura = Parameters<typeof issueInvoiceForOrder>[0];

/**
 * Incaseaza toate rezervarile clientului — chemat cand pleaca un email cu
 * linkul de raport. Nu arunca: raportul e trimis oricum, incasarea esuata
 * ajunge la admin.
 */
export async function incaseazaRezervarile(email: string): Promise<{ incasate: number; esuate: number }> {
  const stripe = getStripe();
  const adresa = email.trim().toLowerCase();
  if (!stripe || !adresa) return { incasate: 0, esuate: 0 };
  await ensureOrderColumns();
  const rezervate = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.incasare, "rezervat"),
        isNotNull(orders.stripePaymentIntentId),
        sql`lower(${orders.email}) = ${adresa}`,
      ),
    );
  let incasate = 0;
  let esuate = 0;
  for (const o of rezervate) {
    if (await incaseazaComanda(stripe, o)) incasate++;
    else esuate++;
  }
  return { incasate, esuate };
}

async function incaseazaComanda(
  stripe: NonNullable<ReturnType<typeof getStripe>>,
  o: typeof orders.$inferSelect,
): Promise<boolean> {
  try {
    await stripe.paymentIntents.capture(o.stripePaymentIntentId!);
    await db
      .update(orders)
      .set({ incasare: "incasat", paidAt: new Date() })
      .where(eq(orders.id, o.id));
    if (o.facturaDate) {
      try {
        await issueInvoiceForOrder(JSON.parse(o.facturaDate) as DateFactura);
      } catch (err) {
        console.error("[plata-rezervata] factura:", o.id, err);
      }
    }
    return true;
  } catch (err) {
    const mesaj = err instanceof Error ? err.message : String(err);
    console.error("[plata-rezervata] capture esuat:", o.id, mesaj);
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[Plata rezervata] NU s-a putut incasa — ${o.email} — ${(o.amount / 100).toFixed(2)} ${o.currency.toUpperCase()}`,
      html: wrapEmail(
        "Incasarea a esuat",
        `<p>Comanda lui <strong>${escapeHtml(o.email)}</strong> trebuia incasata, dar Stripe nu a incasat rezervarea.</p>
        <p>Motiv: ${escapeHtml(mesaj)}</p>
        <p>Comanda: ${escapeHtml(o.id)} · PaymentIntent: ${escapeHtml(o.stripePaymentIntentId || "")}</p>
        <p>Cere plata clientului direct (link de plata sau transfer).</p>`,
      ),
    }).catch(() => {});
    return false;
  }
}

/** Cand am primit materialele: plecarea in retea sau marcajul manual din admin. */
async function materialePrimiteLa(o: typeof orders.$inferSelect): Promise<Date | null> {
  if (o.materialExternAt) return o.materialExternAt;
  if (!o.stripeSessionId) return null;
  const [s] = await db
    .select({ reteaTrimisLa: orderSubmissions.reteaTrimisLa })
    .from(orderSubmissions)
    .where(eq(orderSubmissions.stripeSessionId, o.stripeSessionId))
    .limit(1);
  return s?.reteaTrimisLa ?? null;
}

/** Cronul: alerte la admin si anularea rezervarilor expirate. */
export async function verificaRezervarile(): Promise<{ anulate: number; alerte: number }> {
  const stripe = getStripe();
  if (!stripe) return { anulate: 0, alerte: 0 };
  await ensureOrderColumns();
  const rezervate = await db.select().from(orders).where(eq(orders.incasare, "rezervat"));
  const acum = Date.now();
  let anulate = 0;
  let alerte = 0;
  for (const o of rezervate) {
    const rezervatLa = (o.rezervatLa ?? o.createdAt).getTime();
    const materiale = await materialePrimiteLa(o);
    const start = materiale ? Math.max(rezervatLa, materiale.getTime()) : rezervatLa;
    // Plasa de siguranta: articolele sunt deja live in retea → livrat,
    // incasam chiar daca din admin n-a plecat emailul cu raportul.
    if (materiale && o.stripeSessionId) {
      const r = await campaniaPentruComanda(o.stripeSessionId, null).catch(() => null);
      if (r?.stare === "gasita" && r.campanie.articoleLive > 0) {
        if (await incaseazaComanda(stripe, o)) {
          await sendEmail({
            to: ADMIN_EMAIL,
            subject: `[Plata rezervata] Incasata automat — ${o.email} — ${(o.amount / 100).toFixed(2)} ${o.currency.toUpperCase()}`,
            html: wrapEmail(
              "Incasata automat",
              `<p>Articolele lui <strong>${escapeHtml(o.email)}</strong> sunt live in retea (${r.campanie.articoleLive}), asa ca rezervarea s-a incasat automat.</p>`,
            ),
          }).catch(() => {});
        }
        continue;
      }
    }
    const trecut = acum - start;
    const termen = materiale ? TERMEN_PUBLICARE : TERMEN_FARA_MATERIALE;
    const alerta = materiale ? ALERTA_PUBLICARE : ALERTA_FARA_MATERIALE;
    const suma = `${(o.amount / 100).toFixed(2)} ${o.currency.toUpperCase()}`;

    if (trecut >= termen) {
      try {
        await stripe.paymentIntents.cancel(o.stripePaymentIntentId!);
      } catch (err) {
        // Deja anulat/expirat la Stripe: il marcam anulat oricum.
        console.error("[plata-rezervata] cancel:", o.id, err instanceof Error ? err.message : err);
      }
      await db.update(orders).set({ incasare: "anulat", status: "cancelled" }).where(eq(orders.id, o.id));
      anulate++;
      await sendEmail({
        to: o.email,
        replyTo: ADMIN_EMAIL,
        subject: "Rezervarea de pe card a fost anulată — MediaExpres",
        html: wrapEmail(
          "Rezervarea a fost anulată",
          `<p>Bună ziua,</p>
          <p>${
            materiale
              ? "Nu am reușit să publicăm articolul în 72 de ore de la primirea lui"
              : "Nu am primit articolul pentru comanda dumneavoastră"
          }, așa că rezervarea de <strong>${suma}</strong> de pe card a fost anulată automat. Nu vi s-a încasat nimic, iar banii se deblochează în contul dumneavoastră (de obicei în câteva zile, în funcție de bancă).</p>
          <p>Dacă doriți în continuare publicarea, răspundeți la acest email și reluăm comanda.</p>
          <p>Cu stimă,<br/>Echipa MediaExpres</p>`,
        ),
      }).catch(() => {});
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `[Plata rezervata] ANULATA — ${o.email} — ${suma}`,
        html: wrapEmail(
          "Rezervare anulata",
          `<p>Comanda lui <strong>${escapeHtml(o.email)}</strong> (${suma}) a fost anulata automat: ${
            materiale ? "raportul nu a plecat in 72 de ore de la primirea materialelor" : "materialele nu au venit in 6 zile"
          }. Banii nu s-au incasat.</p>`,
        ),
      }).catch(() => {});
      continue;
    }

    if (trecut >= alerta && !o.rezervareAlertaAt) {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `[Plata rezervata] Mai sunt ${Math.round((termen - trecut) / ORA)} ore — ${o.email} — ${suma}`,
        html: wrapEmail(
          "Rezervare aproape de termen",
          `<p>Comanda lui <strong>${escapeHtml(o.email)}</strong> (${suma}) are banii doar rezervati.</p>
          <p>${
            materiale
              ? "Trimite raportul (butonul „Campanie începută” sau „Trimite raportul” din admin) in urmatoarele ore, altfel rezervarea se anuleaza si banii nu se mai incaseaza."
              : "Clientul inca nu a trimis materialele. Daca nu vin, rezervarea se anuleaza automat."
          }</p>`,
        ),
      }).catch(() => {});
      await db.update(orders).set({ rezervareAlertaAt: new Date() }).where(eq(orders.id, o.id));
      alerte++;
    }
  }
  return { anulate, alerte };
}
