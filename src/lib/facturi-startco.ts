import { db } from "@/db";
import { orderSubmissions, users, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startcoFetch, isStartcoConfigured } from "@/lib/startco";

/*
  16.11.2026 — facturile din StartCo, legate de clienți și de sursa comenzii
  (proprietarul: „le sincronizezi acolo la clienți și comenzi"). Doar citire:
  lista vine live din StartCo (ținută 5 minute în memorie), potrivirea se face
  după CUI, apoi după numele firmei.
*/

export type FacturaStartco = {
  id: number;
  number: number;
  total: number;
  status: "Emisa" | "Incasata" | "Anulata" | string;
  dateEmitted: string;
  dateDue?: string;
  client: { name: string; identifier?: string; email?: string };
};

let cache: { cand: number; date: FacturaStartco[] } | null = null;

export async function facturiStartco(): Promise<FacturaStartco[]> {
  if (!isStartcoConfigured()) return [];
  if (cache && Date.now() - cache.cand < 5 * 60_000) return cache.date;
  try {
    const r = await startcoFetch<FacturaStartco[]>("/developer/invoice", { method: "GET" });
    const date = Array.isArray(r) ? r : [];
    cache = { cand: Date.now(), date };
    return date;
  } catch (e) {
    console.error("[facturi-startco]", e);
    return cache?.date ?? [];
  }
}

/** Cheie de potrivire: doar cifrele CUI-ului (fără RO). */
export function cheieCui(cui?: string | null): string {
  return (cui || "").replace(/\D/g, "");
}

/** Cheie de potrivire după nume: fără formă juridică, diacritice și semne. */
export function cheieNume(nume?: string | null): string {
  return (nume || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(s\.?\s?r\.?\s?l\.?|s\.?\s?a\.?|pfa|ii|persoana fizica autorizata)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Sursa comenzii (format lib/sursa.ts) pentru fiecare firmă, după CUI și după nume. */
export async function surseDupaFirma(): Promise<{ dupaCui: Map<string, string>; dupaNume: Map<string, string> }> {
  const dupaCui = new Map<string, string>();
  const dupaNume = new Map<string, string>();
  const pune = (cui: string | null | undefined, nume: string | null | undefined, sursa: string | null | undefined) => {
    if (!sursa) return;
    const c = cheieCui(cui);
    const n = cheieNume(nume);
    if (c && !dupaCui.has(c)) dupaCui.set(c, sursa);
    if (n && !dupaNume.has(n)) dupaNume.set(n, sursa);
  };
  const subs = await db
    .select({ cui: orderSubmissions.companyCui, cui2: orderSubmissions.cui, nume: orderSubmissions.companyName, sursa: orderSubmissions.source })
    .from(orderSubmissions)
    .catch(() => []);
  for (const s of subs) pune(s.cui || s.cui2, s.nume, s.sursa);
  const plati = await db
    .select({ cui: users.companyCui, nume: users.companyName, sursa: orders.source })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .catch(() => []);
  for (const p of plati) pune(p.cui, p.nume, p.sursa);
  return { dupaCui, dupaNume };
}

export function sursaFacturii(f: FacturaStartco, s: { dupaCui: Map<string, string>; dupaNume: Map<string, string> }): string | null {
  return s.dupaCui.get(cheieCui(f.client?.identifier)) || s.dupaNume.get(cheieNume(f.client?.name)) || null;
}
