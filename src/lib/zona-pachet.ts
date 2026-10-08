import { findPackageById } from "@/data/packages";
import { NEWSPAPERS } from "@/data/newspapers";

/**
 * Zona sau ziarul ales la pachetele care nu acopera toata reteaua (08.10.2026).
 *
 * Proprietarul: „la pachetul regional trebuie o bifa unde iti spune regiunea,
 * Moldova, Transilvania, si noi alegem de acolo ziarele". Pana acum Regional
 * (10 ziare) si Local (1 ziar) se cumparau fara sa spui unde — Florin a
 * comandat Regional si nu stiam pentru ce zona.
 *
 * Alegerea se cere inainte de plata (card sau OP), se pastreaza pe comanda si
 * apare in admin si in observatiile din retea.
 */

export const ZONE = ["Moldova", "Transilvania", "Muntenia", "Banat"] as const;
export type Zona = (typeof ZONE)[number];

export type FelAlegere = "zona" | "ziar" | null;

/** Ce trebuie ales la pachetul asta: o zona (Regional), un ziar (Local) sau nimic. */
export function felAlegere(packageId: string): FelAlegere {
  const p = findPackageById(packageId);
  if (!p) return null;
  if (p.newspapers === 1) return "ziar";
  if (p.newspapers > 1 && p.newspapers < 50) return "zona";
  return null;
}

/** Ziarele judetene, pentru alegerea de la pachetul Local. */
export function ziareLocale(): { nume: string; judet: string }[] {
  return NEWSPAPERS.filter((n) => n.type === "local")
    .map((n) => ({ nume: n.name, judet: n.county || n.city || "" }))
    .sort((a, b) => a.judet.localeCompare(b.judet, "ro"));
}

/**
 * Verifica alegerea si intoarce eticheta care se salveaza pe comanda
 * („Zona: Moldova" / „Ziar: Iași Expres"), sau o eroare pentru client.
 */
export function eticheteazaAlegerea(packageId: string, alegere: string | null | undefined): { ok: true; eticheta: string | null } | { ok: false; eroare: string } {
  const fel = felAlegere(packageId);
  const a = (alegere || "").trim();
  if (!fel) return { ok: true, eticheta: null };
  if (fel === "zona") {
    const z = ZONE.find((x) => x.toLowerCase() === a.toLowerCase());
    return z ? { ok: true, eticheta: `Zona: ${z}` } : { ok: false, eroare: "Alege zona în care vrei ziarele: Moldova, Transilvania, Muntenia sau Banat." };
  }
  const z = ziareLocale().find((x) => x.nume.toLowerCase() === a.toLowerCase());
  return z ? { ok: true, eticheta: `Ziar: ${z.nume}` } : { ok: false, eroare: "Alege ziarul județean în care vrei articolul." };
}
