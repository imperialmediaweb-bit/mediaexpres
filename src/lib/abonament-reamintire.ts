import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { getStripe } from "@/lib/stripe";
import { sendEmail, wrapEmail, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";
import { ZILE_INAINTE, semneazaOprire, eTimpulPentruReamintire, dataRo, sumaAbonament, emailReamintire } from "@/lib/abonament-oprire";

export { verificaOprire, dataRo, sumaAbonament } from "@/lib/abonament-oprire";

/**
 * Reamintirea dinainte de reinnoirea abonamentului (11.10.2026).
 *
 * Proprietarul: „are abonamentul de 400; inainte sa-i ia plata din cont, sa
 * primeasca un email: daca vrea sa continue, il lasi asa, daca vrea sa-l
 * inchida, il inchide". Cu ZILE_INAINTE zile inainte de reinnoire, clientul
 * primeste data, suma si un buton care opreste abonamentul la sfarsitul
 * perioadei platite. Daca nu face nimic, abonamentul merge mai departe.
 *
 * Lista vine direct din Stripe, nu din tabela `subscription`: acolo un
 * abonament fara cont legat nu ajunge (vezi upsertSubscription), si tocmai
 * clientii fara cont sunt cei care trebuie anuntati.
 */

async function emailClient(sub: Stripe.Customer | Stripe.DeletedCustomer | string | null): Promise<string | null> {
  if (!sub || typeof sub === "string" || sub.deleted) return null;
  return sub.email || null;
}

/**
 * Trimite reamintirile scadente. Idempotent: o singura reamintire pe
 * abonament si pe perioada (cheie in app_setting).
 */
export async function trimiteReamintiriAbonamente(acum: number = Date.now()): Promise<{ trimise: string[]; sarite: number }> {
  const stripe = getStripe();
  if (!stripe) return { trimise: [], sarite: 0 };
  const lista = await stripe.subscriptions.list({ status: "active", limit: 100, expand: ["data.customer"] });
  const trimise: string[] = [];
  let sarite = 0;
  for (const sub of lista.data) {
    const sfarsit = sub.current_period_end * 1000;
    if (sub.cancel_at_period_end || !eTimpulPentruReamintire(sfarsit, acum)) {
      sarite++;
      continue;
    }
    const cheie = `abonament-reamintire:${sub.id}:${sub.current_period_end}`;
    const [deja] = await db.select({ key: appSettings.key }).from(appSettings).where(eq(appSettings.key, cheie)).limit(1);
    if (deja) {
      sarite++;
      continue;
    }
    const client = sub.customer as Stripe.Customer | Stripe.DeletedCustomer | string;
    const email = await emailClient(client);
    if (!email) {
      sarite++;
      continue;
    }
    const nume = typeof client !== "string" && !client.deleted ? (client.name || "").split(" ")[0] : "";
    const suma = sumaAbonament(sub);
    const data = dataRo(sfarsit);
    const link = `${SITE.url}/abonament/opreste?t=${encodeURIComponent(semneazaOprire(sub.id, email, acum))}`;
    const m = emailReamintire(nume, suma, data, link);
    // Intai cheia, apoi emailul: un email ratat e mai putin grav decat doua.
    await db.insert(appSettings).values({ key: cheie, value: new Date(acum).toISOString() }).onConflictDoNothing();
    await sendEmail({ to: email, subject: m.subiect, html: m.html, text: m.text, replyTo: ADMIN_EMAIL });
    trimise.push(`${email} (${suma}, ${data})`);
  }
  if (trimise.length) {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Reamintire abonament trimisa: ${trimise.length}`,
      html: wrapEmail("Reamintiri abonament", `<p>Am anuntat reinnoirea, cu ${ZILE_INAINTE} zile inainte:</p><ul>${trimise.map((x) => `<li>${x}</li>`).join("")}</ul><p>Daca vreunul opreste abonamentul, primesti email separat.</p>`),
    });
  }
  return { trimise, sarite };
}
