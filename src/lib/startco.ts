/**
 * Client StartCo (facturare + e-Factura ANAF).
 * Docs: https://api.cloud.startco.ro — OpenAPI 3.0.0, v1.0.0
 *
 * Particularitati ale API-ului (confirmate in changelog-ul lor 2026-06-26):
 *  - raspunsurile sunt "bare" (fara envelope `data`)
 *  - erorile sunt plate: { error: "mesaj", code: "COD" }
 *  - autentificarea e headerul `Authorization` cu tokenul brut (fara "Bearer")
 */

const BASE_URL = "https://api.cloud.startco.ro";

export const STARTCO_SERIES = process.env.STARTCO_SERIES || "";

function token(): string | null {
  return process.env.STARTCO_TOKEN || null;
}

export function isStartcoConfigured(): boolean {
  return Boolean(token());
}

export class StartcoError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "StartcoError";
    this.code = code;
    this.status = status;
  }
}

async function startcoFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const key = token();
  if (!key) throw new StartcoError("STARTCO_TOKEN nu este setat", "NO_TOKEN", 0);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: key,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // raspuns non-JSON — tratat mai jos ca eroare de transport
    }
  }

  if (!res.ok) {
    const e = body as { error?: string; code?: string } | null;
    throw new StartcoError(
      e?.error || `StartCo a raspuns ${res.status}`,
      e?.code || "HTTP_ERROR",
      res.status,
    );
  }

  return body as T;
}

/** Tip de serie, conform enum-ului lor. */
export type SeriesType = "invoice" | "receipt";

export interface StartcoSeries {
  id: number;
  name: string;
  type: SeriesType;
}

/** GET /developer/series — array brut, fara envelope. */
export function listSeries(): Promise<StartcoSeries[]> {
  return startcoFetch<StartcoSeries[]>("/developer/series");
}

/**
 * Rezolva seria configurata in env (dupa nume) la id-ul ei numeric.
 * Returneaza null daca seria nu exista in contul StartCo.
 */
export async function resolveInvoiceSeriesId(): Promise<number | null> {
  if (!STARTCO_SERIES) return null;
  const all = await listSeries();
  const wanted = STARTCO_SERIES.trim().toLowerCase();
  const match = all.find(
    (s) => s.type === "invoice" && s.name.trim().toLowerCase() === wanted,
  );
  return match?.id ?? null;
}

export interface StartcoPartner {
  id: number;
  name: string;
  identifier?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}

/**
 * GET /developer/partners/by-identifier/{identifier}
 * Cauta un partener dupa CUI/CIF. Returneaza null daca nu exista (404).
 */
export async function findPartnerByIdentifier(
  identifier: string,
): Promise<StartcoPartner | null> {
  try {
    return await startcoFetch<StartcoPartner>(
      `/developer/partners/by-identifier/${encodeURIComponent(identifier)}`,
    );
  } catch (err) {
    if (err instanceof StartcoError && err.status === 404) return null;
    throw err;
  }
}

export { startcoFetch };
