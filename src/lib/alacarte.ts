/**
 * „Alege singur ziarele" — clientul bifează publicațiile și plătește exact
 * cât a bifat.
 *
 * 23.09.2026 — cerut de proprietar: „vreau pe MediaExpres o pagină cu ziarele,
 * să aleagă singur, să bifeze un ziar sau mai multe și să cumpere. Dacă vrea
 * doar pe un oraș, sau o publicație, să aleagă doar aia."
 *
 * Până acum alegerea EXISTA în pachete („Local — 150 lei, 1 ziar la alegere"),
 * dar se făcea DUPĂ plată, pe WhatsApp. Adică omul plătea pe încredere și abia
 * pe urmă spunea unde vrea. Cine voia doar Clujul nu avea unde să apese.
 *
 * Prețul, și de ce așa:
 *
 * - Prima publicație costă 150, cât pachetul Local de azi. Nu se poate mai
 *   ieftin fără să facem pachetul existent mincinos.
 * - Bucata scade cu numărul lor: munca pe o plasare în plus e aproape zero
 *   (același text, același material), deci reducerea e reală, nu cadou.
 * - PLAFON 500 DE LEI, oricâte alege. Ăsta e prețul ofertei pe toată rețeaua,
 *   iar o pagină care cere 900 pentru 9 ziare când 50 costă 500 e exact
 *   contradicția care a plecat deja un client (1.500 pe /pachete vs 500 în
 *   reclamă). Așa, de la 5 publicații în sus prețul e egal cu al rețelei
 *   întregi — și atunci pagina îi spune pe față să le ia pe toate.
 *
 * Cazinourile NU trec pe aici: au tarif dublu și reguli de conținut proprii.
 */

import { NEWSPAPERS, type Newspaper } from "@/data/newspapers";

/** Prețul pachetului „toată rețeaua" — plafonul de aici. */
export const PRET_RETEA = 500;

/** Prețul pe bucată, în funcție de câte publicații are coșul. */
const PRET_PE_BUCATA: { deLa: number; pret: number }[] = [
  { deLa: 5, pret: 100 },
  { deLa: 4, pret: 110 },
  { deLa: 3, pret: 120 },
  { deLa: 2, pret: 130 },
  { deLa: 1, pret: 150 },
];

export function pretBucata(cate: number): number {
  const n = Math.max(1, Math.trunc(cate));
  return (PRET_PE_BUCATA.find((p) => n >= p.deLa) ?? PRET_PE_BUCATA[PRET_PE_BUCATA.length - 1])
    .pret;
}

export interface PretAlacarte {
  /** Cât plătește, în lei. Niciodată peste PRET_RETEA. */
  total: number;
  peBucata: number;
  /** A atins plafonul: de aici încolo poate lua toată rețeaua pe aceiași bani. */
  laPlafon: boolean;
  /** Cât ar fi plătit la prețul de o bucată — asta se arată ca economie. */
  faraReducere: number;
}

export function pretAlacarte(cate: number): PretAlacarte {
  const n = Math.max(0, Math.trunc(cate));
  if (n === 0) {
    return { total: 0, peBucata: pretBucata(1), laPlafon: false, faraReducere: 0 };
  }
  const peBucata = pretBucata(n);
  const brut = peBucata * n;
  return {
    total: Math.min(brut, PRET_RETEA),
    peBucata,
    laPlafon: brut >= PRET_RETEA,
    faraReducere: pretBucata(1) * n,
  };
}

/**
 * Câte publicații trebuie să mai adauge ca să scadă prețul pe bucată — textul
 * care îl face să mai bifeze una („încă una și fiecare te costă cu 20 mai
 * puțin"). null când e deja la plafon.
 */
export function urmatorulPrag(
  cate: number,
): { deLa: number; economiePeBucata: number } | null {
  const n = Math.max(0, Math.trunc(cate));
  if (pretAlacarte(Math.max(1, n)).laPlafon) return null;
  const acum = pretBucata(Math.max(1, n));
  const urm = [...PRET_PE_BUCATA]
    .sort((a, b) => a.deLa - b.deLa)
    .find((p) => p.deLa > n && p.pret < acum);
  return urm ? { deLa: urm.deLa, economiePeBucata: acum - urm.pret } : null;
}

/* ------------------------------------------------------------------ */
/* Identificarea publicațiilor                                         */
/* ------------------------------------------------------------------ */

/**
 * Cheia unei publicații în coș și în linkul de plată. Se scoate din NUME, nu
 * din domeniu: două domenii sunt punycode („xn--timiexpres-xxd.ro"), iar o
 * cheie pe care n-o poți citi într-un email de comandă nu ajută pe nimeni.
 */
export function slugZiar(nume: string): string {
  return nume
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .replace(/[ăâ]/gi, "a")
    .replace(/î/gi, "i")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface ZiarAles extends Newspaper {
  slug: string;
}

export const ZIARE_ALEGIBILE: ZiarAles[] = NEWSPAPERS.map((n) => ({
  ...n,
  slug: slugZiar(n.name),
}));

/** Câte publicații are rețeaua, ca să nu fie numărul scris de mână nicăieri. */
export const TOTAL_ZIARE = ZIARE_ALEGIBILE.length;

/**
 * Curăță ce vine din browser: păstrează doar publicații care există, fără
 * dubluri, în ordinea din rețea. Prețul se calculează DIN REZULTATUL ĂSTA,
 * niciodată din suma trimisă de client.
 */
export function ziareDinSluguri(sluguri: string[]): ZiarAles[] {
  const cerute = new Set(sluguri.map((s) => String(s).trim().toLowerCase()));
  return ZIARE_ALEGIBILE.filter((z) => cerute.has(z.slug));
}

/**
 * Ce se scrie în metadata plății și în emailuri. La toată rețeaua ar ieși
 * peste 700 de caractere, iar Stripe taie la 500 pe cheie — deci acolo se
 * scrie „toate".
 */
export function etichetaZiare(ziare: ZiarAles[]): string {
  if (ziare.length >= TOTAL_ZIARE) return "toate";
  return ziare.map((z) => z.slug).join(",");
}

export function numeleZiarelor(sluguri: string): string {
  if (!sluguri) return "";
  if (sluguri === "toate") return `toate cele ${TOTAL_ZIARE} de publicații`;
  const ziare = ziareDinSluguri(sluguri.split(","));
  return ziare.map((z) => z.name).join(", ");
}
