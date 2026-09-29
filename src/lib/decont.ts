/**
 * Portofelul publicatiilor partenere: ce au de incasat si cand pot cere banii.
 *
 * 29.09.2026 — cerut de proprietar, dupa modelul RokaSEO: partenerul isi
 * vede singur banii stransi si cere plata cand ajunge la prag. Pana acum,
 * decontarea era „iti trimitem noi situatia la 500 de lei sau la sfarsitul
 * trimestrului" — adica muncă de mana pentru fiecare partener, si un partener
 * care nu stia niciodata cat are de luat.
 *
 * Regulile, care stau DOAR aici:
 *   - banii intra in sold cand articolul e PUBLICAT (sau a trecut deja de cele
 *     12 luni, „finalizat"); o plasare refuzata, expirata sau anulata nu se
 *     plateste;
 *   - o plasare intra intr-o singura cerere de plata: `statement_id` pus pe
 *     ea e lacatul, iar cererea o rezerva cu un UPDATE conditionat, deci doua
 *     apasari simultane nu pot lua aceeasi plasare de doua ori;
 *   - SUMA NU VINE DIN BROWSER: se aduna pe server din plasarile rezervate;
 *   - o singura cerere deschisa pe rand.
 */

/** Suma minima pentru care partenerul poate cere plata, in lei. */
export const PRAG_RETRAGERE = 200;

/** In cate zile lucratoare platim dupa ce primim factura. */
export const ZILE_PLATA = 10;

/** Starile unei plasari pentru care partenerul e platit. */
export const STARI_PLATIBILE = ["publicat", "finalizat"] as const;

export function ePlatibila(stare: string): boolean {
  return (STARI_PLATIBILE as readonly string[]).includes(stare);
}

export interface PlasarePentruSold {
  status: string;
  pricePartner: number;
  statementId: string | null;
}

export interface Sold {
  /** Publicate si neintrate inca in nicio cerere: se pot cere acum. */
  deIncasat: number;
  /** Publicate, dar deja intr-o cerere care asteapta plata. */
  inPlata: number;
  /** Acceptate, inca nepublicate: vor intra in sold dupa publicare. */
  inLucru: number;
}

/**
 * Soldul, calculat din plasari. `platite` = id-urile cererilor deja achitate:
 * plasarile din ele nu mai apar nicaieri in sold.
 */
export function calculeazaSold(
  plasari: PlasarePentruSold[],
  cereriPlatite: Set<string> = new Set(),
): Sold {
  let deIncasat = 0;
  let inPlata = 0;
  let inLucru = 0;
  for (const p of plasari) {
    const pret = Math.max(0, Math.trunc(p.pricePartner || 0));
    if (ePlatibila(p.status)) {
      if (!p.statementId) deIncasat += pret;
      else if (!cereriPlatite.has(p.statementId)) inPlata += pret;
    } else if (p.status === "trimis" || p.status === "acceptat") {
      inLucru += pret;
    }
  }
  return { deIncasat, inPlata, inLucru };
}

export function poateCerePlata(sold: Sold, areCerereDeschisa: boolean): boolean {
  return !areCerereDeschisa && sold.deIncasat >= PRAG_RETRAGERE;
}

/** „mai ai 60 de lei până poți cere plata" */
export function catMaiAi(deIncasat: number): number {
  return Math.max(0, PRAG_RETRAGERE - Math.max(0, deIncasat));
}

/**
 * IBAN romanesc: RO + 2 cifre + 4 litere (banca) + 16 caractere. Verificam
 * doar forma si cifra de control (mod 97), ca un IBAN cu o cifra gresita sa
 * fie prins inainte sa plece banii in alta parte, nu dupa.
 */
export function normalizeazaIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

export function ibanValid(iban: string): boolean {
  const s = normalizeazaIban(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  if (s.startsWith("RO") && s.length !== 24) return false;
  const mutat = s.slice(4) + s.slice(0, 4);
  const cifre = mutat.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const ch of cifre) rest = (rest * 10 + Number(ch)) % 97;
  return rest === 1;
}

export type StareCerere = "cerut" | "platit" | "anulat";

export function etichetaCerere(stare: string): string {
  switch (stare) {
    case "cerut":
      return "Cerută — o procesăm";
    case "platit":
      return "Plătită";
    case "anulat":
      return "Anulată";
    default:
      return stare;
  }
}
