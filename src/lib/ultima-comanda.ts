import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db";


/**
 * 18.11.2026 — „Ultima comandă: azi la 08:44" pe /oferta-500, din date reale:
 * comenzile platite pe site (order_submission, cu ora) si facturile din
 * StartCo (clientii pe ordin de plata / WhatsApp, doar cu ziua).
 * Fara nume, firme sau sume. Mai vechi de 3 zile: nu se afiseaza deloc.
 */
export type UltimaComanda = { cand: Date; cuOra: boolean };

const dinSite = unstable_cache(
  async (): Promise<string | null> => {
    const r = await db.execute(sql`
      select max(created_at) as t
      from order_submission
      where status in ('paid', 'published')
        and coalesce(stripe_session_id, '') not like 'cs_test_%'
    `);
    const rows = (r as unknown as { rows?: { t: string | null }[] }).rows ?? (r as unknown as { t: string | null }[]);
    const t = rows?.[0]?.t;
    return t ? new Date(t).toISOString() : null;
  },
  ["ultima-comanda-site-v1"],
  { revalidate: 600 },
);

/**
 * Ziua facturilor din StartCo. Cerere proprie cu cache de 10 minute (NU prin
 * startcoFetch, care e no-store si facea pagina /oferta-500 dinamica: eroarea
 * „static to dynamic at runtime" din 18.11.2026).
 */
async function ziileFacturilor(): Promise<string[]> {
  const token = process.env.STARTCO_TOKEN;
  if (!token) return [];
  const r = await fetch("https://api.cloud.startco.ro/developer/invoice", {
    headers: { Authorization: token, Accept: "application/json" },
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return [];
  const j = (await r.json().catch(() => null)) as unknown;
  const lista = Array.isArray(j) ? j : Array.isArray((j as { data?: unknown })?.data) ? (j as { data: unknown[] }).data : [];
  return lista.map((f) => String((f as { dateEmitted?: unknown })?.dateEmitted || ""));
}

export async function ultimaComanda(): Promise<UltimaComanda | null> {
  let site: Date | null = null;
  try {
    const t = await dinSite();
    site = t ? new Date(t) : null;
  } catch (err) {
    console.error("[ultima-comanda]", err instanceof Error ? err.message : err);
  }
  let factura: Date | null = null;
  try {
    const zile = (await ziileFacturilor()).filter(Boolean).sort();
    const z = zile[zile.length - 1];
    // Ziua facturii, la pranz ora Romaniei, ca sa cada sigur in ziua corecta.
    if (z) factura = new Date(`${z}T10:00:00Z`);
  } catch {
    /* fara StartCo ramane doar site-ul */
  }
  const zi = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
  let rez: UltimaComanda | null = null;
  if (site && factura) {
    // Aceeasi zi: comanda de pe site are si ora. Altfel, cea mai noua zi.
    if (zi(site) >= zi(factura)) rez = { cand: site, cuOra: true };
    else rez = { cand: factura, cuOra: false };
  } else if (site) rez = { cand: site, cuOra: true };
  else if (factura) rez = { cand: factura, cuOra: false };
  if (!rez) return null;
  if (Date.now() - rez.cand.getTime() > 3.5 * 24 * 3600_000) return null;
  return rez;
}

/** „azi la 08:44", „ieri", „acum 2 zile". */
export function textUltimaComanda(u: UltimaComanda, acum = new Date()): string {
  const zi = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
  const dif = Math.round((Date.parse(zi(acum)) - Date.parse(zi(u.cand))) / 86_400_000);
  const ora = u.cand.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });
  const ziua = dif <= 0 ? "azi" : dif === 1 ? "ieri" : `acum ${dif} zile`;
  return u.cuOra ? `${ziua} la ${ora}` : ziua;
}
