import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions, orders, users } from "@/db/schema";
import { facturiStartco, cheieCui, type FacturaStartco } from "@/lib/facturi-startco";
import { sendEmail, wrapEmail } from "@/lib/email";
import { SITE } from "@/data/site";

/**
 * 19.11.2026 — facturile pe OP (StartCo) ramase „Emisa": la 30 de minute
 * dupa ce le vedem, clientul primeste un e-mail sa confirme transferul (un
 * rand de text sau dovada platii). Dupa 2 zile, o singura reamintire.
 * Proprietarul marcheaza factura „Incasata" in StartCo cand vede banii in
 * BT; de atunci nu mai pleaca nimic. Oprire: CONFIRMARE_PLATA=0.
 * Doar facturile emise din 19.11.2026 incolo (cele vechi nu primesc nimic).
 */
const DE_LA = "2026-11-19";
const MINUTE_PRIMUL = Number(process.env.CONFIRMARE_PLATA_MINUTE || 30);
const ZILE_REAMINTIRE = 2;

let gata: Promise<unknown> | null = null;
function asiguraTabel() {
  if (!gata) {
    gata = db.execute(sql`CREATE TABLE IF NOT EXISTS "confirmare_plata" (
      "factura_id" integer PRIMARY KEY,
      "numar" integer,
      "vazut_la" timestamp NOT NULL DEFAULT now(),
      "email" text,
      "trimis_la" timestamp,
      "reamintire_la" timestamp
    )`);
    gata.catch(() => (gata = null));
  }
  return gata;
}

/** E-mailul clientului: din factura, altfel din comenzile de pe site dupa CUI. */
async function emailDupaCui(): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  const subs = await db
    .select({ cui: orderSubmissions.companyCui, cui2: orderSubmissions.cui, email: orderSubmissions.email })
    .from(orderSubmissions)
    .catch(() => []);
  for (const s of subs) {
    const c = cheieCui(s.cui || s.cui2);
    if (c && s.email && !m.has(c)) m.set(c, s.email);
  }
  const plati = await db
    .select({ cui: users.companyCui, email: orders.email })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .catch(() => []);
  for (const p of plati) {
    const c = cheieCui(p.cui);
    if (c && p.email && !m.has(c)) m.set(c, p.email);
  }
  return m;
}

/**
 * 22.11.2026 — clientul a platit deja pe site (card Stripe sau OP cu dovada
 * incarcata / confirmat in admin), dar factura din StartCo e inca „Emisa":
 * NU primeste e-mailul (Gheorghitoi Marius: „ciudat, am primit confirmarea
 * de plata odata cu comanda"). Cautam in ultimele 60 de zile dupa CUI si e-mail.
 */
async function platitiPeSite(): Promise<{ cui: Set<string>; email: Set<string> }> {
  const cui = new Set<string>();
  const email = new Set<string>();
  const subs = await db
    .execute(sql`SELECT "email", "cui", "company_cui" FROM "order_submission"
      WHERE "created_at" > now() - interval '60 days'
        AND ("payment_method" IS DISTINCT FROM 'op' OR "status" IN ('paid','published') OR "payment_proof" IS NOT NULL)`)
    .catch(() => null);
  const rs = ((subs as unknown as { rows?: unknown[] })?.rows ?? (subs as unknown as unknown[]) ?? []) as {
    email: string | null;
    cui: string | null;
    company_cui: string | null;
  }[];
  for (const s of rs) {
    const c = cheieCui(s.cui || s.company_cui);
    if (c) cui.add(c);
    if (s.email) email.add(s.email.trim().toLowerCase());
  }
  const plati = await db
    .execute(sql`SELECT "email" FROM "order" WHERE "status" = 'paid' AND "created_at" > now() - interval '60 days'`)
    .catch(() => null);
  const rp = ((plati as unknown as { rows?: unknown[] })?.rows ?? (plati as unknown as unknown[]) ?? []) as { email: string | null }[];
  for (const p of rp) if (p.email) email.add(p.email.trim().toLowerCase());
  return { cui, email };
}

function oraRomaniei(d = new Date()): number {
  return Number(new Intl.DateTimeFormat("ro-RO", { hour: "numeric", hour12: false, timeZone: "Europe/Bucharest" }).format(d));
}

function continut(f: FacturaStartco, reamintire: boolean): { subiect: string; html: string; text: string } {
  const suma = `${f.total} lei`;
  const subiect = reamintire
    ? `Un mic semn de la dumneavoastră și pornim comanda (factura nr. ${f.number})`
    : `Vă mulțumim pentru comandă! Un singur pas și pornim (factura nr. ${f.number})`;
  const wa = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(`Bună ziua, am făcut plata pentru factura nr. ${f.number}.`)}`;
  const intro = reamintire
    ? `<p>Bună ziua,</p>
<p>Revenim cu drag în legătură cu factura nr. <strong>${f.number}</strong> (${suma}). La noi nu apare încă plata, și nu vrem să vă țină nimic pe loc.</p>`
    : `<p>Bună ziua,</p>
<p>Vă mulțumim din suflet că ați ales MediaExpres! Ați primit factura nr. <strong>${f.number}</strong>, în valoare de <strong>${suma}</strong>.</p>`;
  const body = `${intro}
<p>Când faceți transferul, <strong>dați-ne de veste</strong> cum vă e mai ușor:</p>
<ul>
<li>un răspuns scurt la acest e-mail, de exemplu „am plătit”;</li>
<li>un mesaj pe WhatsApp: <a href="${wa}">${SITE.phone}</a>;</li>
<li>sau dovada plății (captura ordinului de plată), atașată aici sau pe WhatsApp.</li>
</ul>
<p>Imediat ce primim confirmarea, <strong>pornim comanda</strong> și vă publicăm articolul în maximum 12 ore lucrătoare.</p>
<p style="background:#faf7f2;border-radius:8px;padding:12px 14px;">Datele pentru transfer:<br>
${SITE.billing.company}<br>
IBAN: <strong>${SITE.billing.iban}</strong> (${SITE.billing.bank})<br>
La detalii: factura nr. ${f.number}</p>
<p>Dacă ați plătit deja, vă mulțumim frumos și vă rugăm să ignorați acest mesaj.</p>
<p>Cu drag,<br>Echipa MediaExpres</p>`;
  const text = `Bună ziua,
${reamintire ? `Revenim cu drag în legătură cu factura nr. ${f.number} (${suma}). La noi nu apare încă plata.` : `Vă mulțumim din suflet că ați ales MediaExpres! Ați primit factura nr. ${f.number}, în valoare de ${suma}.`}
Când faceți transferul, dați-ne de veste: un răspuns la acest e-mail („am plătit”), un mesaj pe WhatsApp la ${SITE.phone} sau dovada plății.
Imediat ce primim confirmarea, pornim comanda și vă publicăm articolul în maximum 12 ore lucrătoare.
Transfer: ${SITE.billing.company}, IBAN ${SITE.billing.iban} (${SITE.billing.bank}), la detalii: factura nr. ${f.number}.
Dacă ați plătit deja, vă mulțumim frumos și ignorați acest mesaj.
Cu drag, Echipa MediaExpres`;
  return { subiect, html: wrapEmail(subiect, body), text };
}

export interface RezultatConfirmare {
  oprit?: boolean;
  in_afara_orelor?: boolean;
  emise: number;
  trimise: { numar: number; email: string; tip: "prima" | "reamintire" }[];
  fara_email: number[];
  /** Facturi sarite: clientul a platit deja pe site. */
  deja_platite: number[];
  proba?: boolean;
}

export async function ruleazaConfirmarePlata(opt: { proba?: boolean } = {}): Promise<RezultatConfirmare> {
  if (process.env.CONFIRMARE_PLATA === "0") return { oprit: true, emise: 0, trimise: [], fara_email: [], deja_platite: [] };
  await asiguraTabel();
  const toate = await facturiStartco();
  const emise = toate.filter(
    (f) => f.status === "Emisa" && Number(f.total) > 0 && String(f.dateEmitted || "") >= DE_LA,
  );
  const rez: RezultatConfirmare = { emise: emise.length, trimise: [], fara_email: [], deja_platite: [], proba: opt.proba };
  if (!emise.length) return rez;

  // Prima data cand vedem factura = ceasul celor 30 de minute.
  for (const f of emise) {
    await db.execute(sql`INSERT INTO "confirmare_plata" ("factura_id", "numar") VALUES (${f.id}, ${f.number})
      ON CONFLICT ("factura_id") DO NOTHING`);
  }
  const ora = oraRomaniei();
  if (ora < 8 || ora >= 21) return { ...rez, in_afara_orelor: true };

  const ids = emise.map((f) => f.id);
  const r = await db.execute(sql`SELECT "factura_id", "vazut_la", "trimis_la", "reamintire_la" FROM "confirmare_plata"
    WHERE "factura_id" IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`);
  const rows = ((r as unknown as { rows?: unknown[] }).rows ?? (r as unknown as unknown[])) as {
    factura_id: number;
    vazut_la: string;
    trimis_la: string | null;
    reamintire_la: string | null;
  }[];
  const stare = new Map(rows.map((x) => [Number(x.factura_id), x]));
  const emailuri = await emailDupaCui();
  const platiti = await platitiPeSite();
  const acum = Date.now();

  for (const f of emise) {
    const s = stare.get(f.id);
    if (!s) continue;
    let tip: "prima" | "reamintire" | null = null;
    if (!s.trimis_la && acum - new Date(s.vazut_la).getTime() >= MINUTE_PRIMUL * 60_000) tip = "prima";
    else if (s.trimis_la && !s.reamintire_la && acum - new Date(s.trimis_la).getTime() >= ZILE_REAMINTIRE * 86_400_000)
      tip = "reamintire";
    if (!tip) continue;
    const email = (f.client?.email || "").trim() || emailuri.get(cheieCui(f.client?.identifier)) || "";
    if (!email) {
      rez.fara_email.push(f.number);
      continue;
    }
    if (platiti.cui.has(cheieCui(f.client?.identifier)) || platiti.email.has(email.toLowerCase())) {
      rez.deja_platite.push(f.number);
      continue;
    }
    rez.trimise.push({ numar: f.number, email, tip });
    if (opt.proba) continue;
    const c = continut(f, tip === "reamintire");
    const trimis = await sendEmail({ to: email, subject: c.subiect, html: c.html, text: c.text, replyTo: process.env.CONTACT_FROM || undefined });
    if (!trimis.ok) continue;
    if (tip === "prima") {
      await db.execute(sql`UPDATE "confirmare_plata" SET "trimis_la" = now(), "email" = ${email} WHERE "factura_id" = ${f.id}`);
    } else {
      await db.execute(sql`UPDATE "confirmare_plata" SET "reamintire_la" = now() WHERE "factura_id" = ${f.id}`);
    }
  }
  return rez;
}
