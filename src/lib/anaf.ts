/**
 * Cautare firma dupa CUI in registrul public ANAF (serviciul PlatitorTvaRest).
 *
 * Folosit inainte de factura automata: pe factura punem numele si adresa
 * OFICIALE, nu ce a tastat clientul in formular — exact ce face StartCo cand
 * emiti manual si cauti clientul dupa CUI.
 */

const ANAF_URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";

export interface AnafCompany {
  cui: string;
  name: string;
  address: string;
  city: string;
  county: string;
  /** Firma e declarata inactiva fiscal de ANAF. */
  inactive: boolean;
  /** Firma e radiata (data radierii, daca exista). */
  deregistered: string | null;
}

export type AnafLookup =
  | { status: "found"; company: AnafCompany }
  | { status: "not_found" }
  | { status: "invalid" }
  | { status: "error"; message: string };

/** Accepta "RO 12345678", "ro12345678", "12345678" — intoarce doar cifrele. */
export function normalizeCui(raw: string): string | null {
  const digits = raw.trim().replace(/^ro/i, "").replace(/[\s.-]/g, "");
  return /^\d{2,10}$/.test(digits) ? digits : null;
}

export async function lookupCui(raw: string): Promise<AnafLookup> {
  const cui = normalizeCui(raw);
  if (!cui) return { status: "invalid" };

  try {
    const res = await fetch(ANAF_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ cui: Number(cui), data: new Date().toISOString().slice(0, 10) }]),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    // CUI inexistent: ANAF raspunde 404, dar cu corp JSON valid ({ notFound: [...] }).
    if (!res.ok && res.status !== 404) {
      return { status: "error", message: `ANAF a raspuns ${res.status}` };
    }

    const body = (await res.json()) as {
      found?: Array<{
        date_generale?: { denumire?: string; adresa?: string };
        stare_inactiv?: { statusInactivi?: boolean; dataRadiere?: string };
        adresa_sediu_social?: { sdenumire_Localitate?: string; sdenumire_Judet?: string };
      }>;
    };
    const f = body.found?.[0];
    if (!f?.date_generale?.denumire) return { status: "not_found" };

    return {
      status: "found",
      company: {
        cui,
        name: f.date_generale.denumire.trim(),
        address: (f.date_generale.adresa || "").trim(),
        city: (f.adresa_sediu_social?.sdenumire_Localitate || "").trim(),
        county: (f.adresa_sediu_social?.sdenumire_Judet || "").trim(),
        inactive: Boolean(f.stare_inactiv?.statusInactivi),
        deregistered: f.stare_inactiv?.dataRadiere?.trim() || null,
      },
    };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}
