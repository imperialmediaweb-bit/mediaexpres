/**
 * Suma unei comenzi, cu moneda ei (12.10.2026). Pana la pachetul in engleza
 * (149 EUR) toate comenzile erau in lei, iar adminul scria „lei" peste tot.
 */
export function sumaComenzii(amount: number, currency: string | null | undefined, zecimale = 0): string {
  const c = (currency || "ron").toLowerCase();
  const v = (amount / 100).toFixed(zecimale);
  return c === "ron" ? `${v} lei` : `${v} ${c.toUpperCase()}`;
}

/** Aproximare pentru retea, care tine pretul in lei. */
export const LEI_PE_EURO = 5;

export function inLei(amount: number, currency: string | null | undefined): number {
  const c = (currency || "ron").toLowerCase();
  const v = amount / 100;
  return Math.round(c === "eur" ? v * LEI_PE_EURO : v);
}
