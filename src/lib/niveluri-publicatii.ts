/**
 * Nivelurile publicatiilor partenere — cele pe care NU le detinem.
 *
 * 14.09.2026 — decizia: nu negociem cu fiecare ziar in parte si nu afisam un
 * pret fix pentru toti. Un ziar judetean mic accepta 80 de lei, unul cu
 * 100.000 de cititori cere 400. Cu pret unic ii pierzi exact pe cei care
 * merita. Deci publicatia e incadrata intr-un nivel, dupa cifre verificabile,
 * iar nivelul are tarif fix. Aceleasi reguli pentru toti, scrise pe fata.
 *
 * Adaosul e SUMA FIXA pe plasare, nu procent: munca noastra e aceeasi fie ca
 * ziarul cere 80 sau 400 — un articol, un email, un rand in raport.
 *
 * Regula de intrare, inaintea oricarui nivel: publicatie cu redactie, care
 * publica stiri proprii in mod curent. Site-urile facute exclusiv pentru
 * articole platite nu intra, oricat de bun ar fi domeniul. Aceeasi regula se
 * aplica si retelei noastre, de asta nu e ipocrizie: ziarele noastre publica
 * zilnic, au pagini de Facebook cu cititori si arhiva reala.
 */

export const ADAOS_PLASARE = 250;

export interface Nivel {
  id: "bronz" | "argint" | "aur" | "platina";
  nume: string;
  /** Scorul de autoritate minim (Open PageRank 0-10 sau Moz DA, vezi `daMin`). */
  daMin: number;
  traficMin: number;
  /** Cat ii platim pe articol publicat. */
  plata: number;
}

export const NIVELURI: Nivel[] = [
  { id: "bronz", nume: "Bronz", daMin: 0, traficMin: 0, plata: 80 },
  { id: "argint", nume: "Argint", daMin: 15, traficMin: 10_000, plata: 150 },
  { id: "aur", nume: "Aur", daMin: 25, traficMin: 50_000, plata: 250 },
  { id: "platina", nume: "Platină", daMin: 35, traficMin: 150_000, plata: 400 },
];

/** Pretul catre client pentru o plasare pe nivelul dat. */
export function pretClient(plata: number): number {
  return plata + ADAOS_PLASARE;
}

/**
 * Nivelul propus pentru o publicatie.
 *
 * Se cere SI autoritate, SI trafic — nu „oricare dintre ele". Un domeniu
 * vechi fara cititori si un site cu trafic cumparat arata amandoua bine pe
 * un singur indicator. Publicatia urca de nivel doar cand le are pe amandoua.
 */
export function nivelPropus(da: number | null, trafic: number | null): Nivel {
  const d = da ?? 0;
  const t = trafic ?? 0;
  let ales = NIVELURI[0];
  for (const n of NIVELURI) {
    if (d >= n.daMin && t >= n.traficMin) ales = n;
  }
  return ales;
}

export function nivelDupaId(id: string | null | undefined): Nivel | null {
  return NIVELURI.find((n) => n.id === id) ?? null;
}
