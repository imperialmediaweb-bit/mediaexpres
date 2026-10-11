import crypto from "crypto";
import type Stripe from "stripe";
import { wrapEmail } from "@/lib/email";
import { SITE } from "@/data/site";

/**
 * Partea fara Stripe/baza de date a reamintirii de abonament (11.10.2026):
 * linkul semnat de oprire, fereastra de trimitere si textul emailului.
 * Separata ca sa poata fi testata; cronul e in abonament-reamintire.ts.
 */

export const ZILE_INAINTE = 3;
const ZI = 86_400_000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET lipseste");
    return "dev-secret-change-in-production-please-32-chars";
  }
  return s;
}

const semnatura = (payload: string) => crypto.createHmac("sha256", secret()).update(`abonament|${payload}`).digest("hex");

/** Link-ul de oprire: valabil 45 de zile, legat de abonament si de email. */
export function semneazaOprire(subId: string, email: string, acum: number = Date.now()): string {
  const payload = [subId, email, acum + 45 * ZI].join("|");
  return `${Buffer.from(payload).toString("base64url")}.${semnatura(payload)}`;
}

export function verificaOprire(token: string, acum: number = Date.now()): { subId: string; email: string } | null {
  const [b64, sig] = (token || "").split(".");
  if (!b64 || !sig) return null;
  let payload: string;
  try {
    payload = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const asteptat = semnatura(payload);
  if (sig.length !== asteptat.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(asteptat))) return null;
  const [subId, email, exp] = payload.split("|");
  if (!subId || !exp || Number(exp) < acum) return null;
  return { subId, email: email || "" };
}

export function dataRo(ms: number): string {
  return new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" }).format(ms);
}

export function sumaAbonament(sub: Stripe.Subscription): string {
  const pret = sub.items?.data?.[0]?.price;
  const bani = pret?.unit_amount ?? 0;
  const moneda = (pret?.currency || "ron").toLowerCase() === "ron" ? "lei" : (pret?.currency || "").toUpperCase();
  return `${Math.round(bani / 100)} ${moneda}`;
}

/** True cand reinnoirea pica in urmatoarele ZILE_INAINTE zile. */
export function eTimpulPentruReamintire(sfarsitPerioadaMs: number, acum: number = Date.now()): boolean {
  const ramas = sfarsitPerioadaMs - acum;
  return ramas > 0 && ramas <= ZILE_INAINTE * ZI;
}

export function emailReamintire(nume: string, suma: string, data: string, linkOprire: string): { subiect: string; html: string; text: string } {
  const subiect = `Abonamentul MediaExpres se reînnoiește pe ${data}`;
  const salut = nume ? `Bună, ${nume}!` : "Bună ziua!";
  const html = wrapEmail(
    subiect,
    `<p>${salut}</p>
<p>Abonamentul tău MediaExpres, de <strong>${suma} pe lună</strong>, se reînnoiește automat pe <strong>${data}</strong>, când se face și plata de pe card.</p>
<p><strong>Vrei să continui?</strong> Nu trebuie să faci nimic. Abonamentul merge mai departe, ca până acum.</p>
<p><strong>Vrei să-l oprești?</strong> Apasă butonul de mai jos. Nu se mai face nicio plată, iar până pe ${data} rămâi cu tot ce ai plătit deja.</p>
<p style="margin:24px 0;"><a href="${linkOprire}" style="background:#111111;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Opresc abonamentul</a></p>
<p>Ai o întrebare? Răspunde la acest email sau scrie-ne pe WhatsApp: ${SITE.phone}.</p>
<p>Mulțumim,<br>Echipa MediaExpres</p>`,
  );
  const text = `${salut}

Abonamentul tău MediaExpres, de ${suma} pe lună, se reînnoiește automat pe ${data}, când se face și plata de pe card.

Vrei să continui? Nu trebuie să faci nimic.
Vrei să-l oprești? Intră aici: ${linkOprire}
Nu se mai face nicio plată, iar până pe ${data} rămâi cu tot ce ai plătit deja.

Întrebări: răspunde la acest email sau pe WhatsApp, ${SITE.phone}.

Echipa MediaExpres`;
  return { subiect, html, text };
}

