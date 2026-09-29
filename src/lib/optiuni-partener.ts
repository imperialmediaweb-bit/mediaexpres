/**
 * Optiunile pe care o publicatie partenera le vinde PE LANGA articol
 * (postare pe Facebook, fixat pe prima pagina) si cum le pretuim noi.
 *
 * 29.09.2026 — cerut de proprietar: „cand partenerul isi adauga site-ul,
 * poate pune si optiuni, daca are pentru pagina de Facebook etc.; si
 * cumulezi si cresti si pretul nostru".
 *
 * La articol adaosul nostru e o suma fixa (250, lib/niveluri-publicatii.ts),
 * fiindca munca e aceeasi oricat cere ziarul. La o optiune de 50 de lei, 250
 * ar face-o de nevandut; aici adaosul e PROCENT, cu un minim.
 */

export const ADAOS_OPTIUNE_PROCENT = 50;
export const ADAOS_OPTIUNE_MINIM = 30;

export const OPTIUNI_POSIBILE = [
  { key: "facebook", eticheta: "Postare pe pagina de Facebook a publicației" },
  { key: "prima_pagina", eticheta: "Fixat pe prima pagină 7 zile" },
] as const;

export type CheieOptiune = (typeof OPTIUNI_POSIBILE)[number]["key"];

export interface OptiunePartener {
  key: CheieOptiune;
  /** Cat ii platim partenerului pentru optiune, in lei. */
  pret: number;
}

export function etichetaOptiune(key: string): string {
  return OPTIUNI_POSIBILE.find((o) => o.key === key)?.eticheta || key;
}

/** Cat plateste clientul pentru o optiune care il costa pe partener `pret`. */
export function pretOptiuneClient(pret: number): number {
  const p = Math.max(0, Math.round(pret));
  return p + Math.max(ADAOS_OPTIUNE_MINIM, Math.round((p * ADAOS_OPTIUNE_PROCENT) / 100));
}

/** Citeste coloana JSON de pe publicatie, aruncand ce nu e valid. */
export function citesteOptiuni(json: string | null | undefined): OptiunePartener[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    const chei = new Set(OPTIUNI_POSIBILE.map((o) => o.key as string));
    return arr
      .filter((o) => o && chei.has(o.key) && Number.isFinite(Number(o.pret)) && Number(o.pret) > 0)
      .map((o) => ({ key: o.key as CheieOptiune, pret: Math.round(Number(o.pret)) }));
  } catch {
    return [];
  }
}
