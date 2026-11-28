import { SITE } from "@/data/site";

/**
 * 28.11.2026 (owner): la OP pleaca intai o PROFORMA facuta de noi, nu factura
 * StartCo. Factura fiscala se emite abia cand adminul confirma incasarea
 * („Confirma plata" in /admin/materiale) — altfel StartCo se umplea de facturi
 * pentru comenzi pe care omul nu le mai platea (MARIANA SERBAN 208/209).
 *
 * Numarul proformei e derivat din comanda (data + inceputul id-ului), deci nu
 * cere coloana noua si e acelasi oriunde il afisam (pagina, email, reamintire).
 */
export function numarProforma(id: string, creat: Date | string): string {
  const d = new Date(creat);
  const p = (n: number) => String(n).padStart(2, "0");
  return `PF-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${id.replace(/-/g, "").slice(0, 5).toUpperCase()}`;
}

/** Pagina proformei (publica prin referinta comenzii, ca pagina de plata). */
export function linkProforma(ref: string): string {
  return `${SITE.url}/comanda/proforma/${encodeURIComponent(ref)}`;
}
