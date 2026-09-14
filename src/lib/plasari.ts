import { ADAOS_PLASARE } from "@/lib/niveluri-publicatii";
import { adaugaZileLucratoare } from "@/lib/zile-lucratoare";

/**
 * Regulile unei plasari pe o publicatie partenera, intr-un singur loc.
 *
 * 14.09.2026 — ce se intampla si cand. Tranzitiile se verifica PE SERVER, nu
 * in interfata: butonul poate fi vechi (pagina deschisa de ieri), iar un
 * refuz trimis dupa termen nu are voie sa treaca doar fiindca browserul nu
 * stia.
 */

export const ZILE_REFUZ = 2;
export const ZILE_PUBLICARE = 3;
/** Garantia din contract: articolul ramane online un an. */
export const LUNI_ONLINE = 12;

export type StarePlasare =
  | "trimis"
  | "acceptat"
  | "publicat"
  | "finalizat"
  | "refuzat"
  | "expirat"
  | "anulat";

/**
 * „expirat" si „finalizat" sunt lucruri DIFERITE si nu au voie sa imparta un
 * cuvant: primul inseamna ca partenerul n-a raspuns sau n-a publicat la timp,
 * adica o problema de rezolvat azi; al doilea inseamna ca cele 12 luni s-au
 * incheiat cu bine, adica o obligatie stinsa.
 */
const TRANZITII: Record<StarePlasare, StarePlasare[]> = {
  trimis: ["acceptat", "refuzat", "expirat", "anulat"],
  acceptat: ["publicat", "expirat", "anulat"],
  publicat: ["finalizat", "anulat"],
  finalizat: [],
  refuzat: [],
  expirat: [],
  anulat: [],
};

export function tranzitiePermisa(de_la: string, la: StarePlasare): boolean {
  const lista = TRANZITII[de_la as StarePlasare];
  return Array.isArray(lista) && lista.includes(la);
}

export function eStareFinala(stare: string): boolean {
  return ["finalizat", "refuzat", "expirat", "anulat"].includes(stare);
}

/** Cat incasam de la client pentru o plasare la tariful dat. */
export function pretCatreClient(tarifPartener: number): number {
  return tarifPartener + ADAOS_PLASARE;
}

export interface Termene {
  deadlineRefuz: Date;
  deadlinePublicare: Date;
}

/** Termenele, calculate O DATA, la trimitere, si scrise pe plasare. */
export function termenePlasare(trimisLa: Date = new Date()): Termene {
  return {
    deadlineRefuz: adaugaZileLucratoare(trimisLa, ZILE_REFUZ),
    deadlinePublicare: adaugaZileLucratoare(trimisLa, ZILE_PUBLICARE),
  };
}

export function onlinePanaLa(publicatLa: Date): Date {
  const d = new Date(publicatLa.getTime());
  d.setMonth(d.getMonth() + LUNI_ONLINE);
  return d;
}

export function etichetaStare(stare: string): string {
  switch (stare) {
    case "trimis": return "Trimis — așteptăm răspunsul";
    case "acceptat": return "Acceptat — se publică";
    case "publicat": return "Publicat";
    case "finalizat": return "Încheiat (12 luni trecute)";
    case "refuzat": return "Refuzat de publicație";
    case "expirat": return "Expirat — n-a răspuns la timp";
    case "anulat": return "Anulat de noi";
    default: return stare;
  }
}

/** „mai ai 2 zile", „a expirat acum 3 ore" — pentru panoul partenerului. */
export function timpRamas(pana: Date, acum: Date = new Date()): string {
  const ms = pana.getTime() - acum.getTime();
  const ore = Math.round(Math.abs(ms) / 3_600_000);
  const text = ore < 24 ? (ore <= 1 ? "o oră" : `${ore} ore`) : `${Math.round(ore / 24)} zile`;
  return ms >= 0 ? `mai ai ${text}` : `termenul a trecut de ${text}`;
}

/**
 * Domeniul clientului, din notele de linkuri — singurul lucru despre client
 * pe care partenerul IL VEDE oricum, fiindca e chiar linkul pe care il pune.
 * Il folosim la verificarea lunara a linkului.
 */
export function domeniulDinNote(linkNotes: string | null | undefined): string | null {
  if (!linkNotes) return null;
  const m = linkNotes.match(/https?:\/\/([^\s/"'<>)]+)/i);
  if (!m) return null;
  return m[1].replace(/^www\./i, "").toLowerCase();
}
