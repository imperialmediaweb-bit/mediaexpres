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

// Confirmat pe raspunsul real al API-ului (24 aug): campul cu numele seriei
// se cheama `series`, nu `name` — ex: {"id":1554,"series":"1","start":1,"type":"invoice"}.
export interface StartcoSeries {
  id: number;
  series: string;
  start?: number;
  type: SeriesType;
}

/** GET /developer/series — array brut, fara envelope. */
export function listSeries(): Promise<StartcoSeries[]> {
  return startcoFetch<StartcoSeries[]>("/developer/series");
}

/**
 * Verifica daca seria din env exista chiar in contul StartCo.
 * Utila la diagnosticare — POST /developer/invoice cere numele seriei, nu id-ul.
 */
export async function seriesExists(): Promise<boolean> {
  if (!STARTCO_SERIES) return false;
  const wanted = STARTCO_SERIES.trim().toLowerCase();
  const all = await listSeries();
  return all.some(
    (s) => s.type === "invoice" && s.series.trim().toLowerCase() === wanted,
  );
}

// ---------------------------------------------------------------------------
// Facturi
// ---------------------------------------------------------------------------

/** Denumirea liniei de pe factura, identica pentru toate pachetele. */
export const INVOICE_PRODUCT_NAME = "Promovare in 50 portaluri online";

export interface StartcoInvoice {
  id: number;
  number: number;
  series: string;
  total: number;
  amount: number;
  tva: number;
  currency: string;
  status: "Emisa" | "Incasata" | "Anulata";
  /** Link semnat, cu viata scurta — nu il trimite clientului. */
  downloadUrl?: string;
  /** Link public permanent catre pagina facturii — asta se trimite clientului. */
  shareUrl?: string | null;
}

export interface InvoiceClientInput {
  /** CUI/CIF pentru firme, CNP pentru persoane fizice. Obligatoriu. */
  identifier: string;
  type: "business" | "personal";
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface CreateInvoiceInput {
  client: InvoiceClientInput;
  /** Suma finala facturata, in RON. */
  amount: number;
  /** Denumirea serviciului pe factura. */
  productName?: string;
  /** Text scurt pe factura (max 200 caractere impus de API). */
  mentions?: string;
  /** Data emiterii, format yyyy-MM-dd. Implicit: azi. */
  dateEmitted?: string;
  dateDue?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * POST /developer/invoice
 *
 * Firma noastra NU e platitoare de TVA, deci liniile se trimit cu tva 0 si
 * includeTva false — orice cota nenula intoarce NOT_TVA_PAYER.
 *
 * Nu folosim campul `payments` la creare: documentatia spune ca o plata esuata
 * sterge automat factura (rollback). Preferam o factura emisa si o plata
 * neinregistrata decat sa pierdem factura cu totul.
 */
export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<StartcoInvoice> {
  if (!STARTCO_SERIES) {
    throw new StartcoError(
      "STARTCO_SERIES nu este setat",
      "NO_SERIES",
      0,
    );
  }

  const emitted = input.dateEmitted || today();

  return startcoFetch<StartcoInvoice>("/developer/invoice", {
    method: "POST",
    body: JSON.stringify({
      series: STARTCO_SERIES,
      currency: "RON",
      dateEmitted: emitted,
      // Platit deja prin card, deci scadenta e chiar ziua emiterii.
      dateDue: input.dateDue || emitted,
      language: "ro",
      ...(input.mentions ? { mentions: input.mentions.slice(0, 200) } : {}),
      client: {
        identifier: input.client.identifier,
        type: input.client.type,
        // Pentru firme romanesti, StartCo completeaza singur din registrul CUI.
        ...(input.client.name ? { name: input.client.name } : {}),
        ...(input.client.address ? { address: input.client.address } : {}),
        ...(input.client.city ? { city: input.client.city } : {}),
        ...(input.client.country ? { country: input.client.country } : {}),
        ...(input.client.email ? { email: input.client.email } : {}),
        ...(input.client.phone ? { phone: input.client.phone } : {}),
        saveToDb: true,
      },
      products: [
        {
          name: input.productName || INVOICE_PRODUCT_NAME,
          price: input.amount,
          um: "buc",
          qty: 1,
          risky: false,
          includeTva: false,
          tva: 0,
        },
      ],
    }),
  });
}

export interface StartcoPaymentResult {
  id: number;
  type: "receipt" | "extras";
  number: string;
  amount: string;
}

/**
 * POST /developer/invoice/payment/{invoiceId}
 * Marcheaza factura ca incasata. Pentru plati cu cardul folosim tipul `extras`
 * (extras de cont), cu referinta Stripe drept numar de document.
 */
export function recordInvoicePayment(args: {
  invoiceId: number;
  amount: number;
  reference: string;
  dateEmitted?: string;
}): Promise<StartcoPaymentResult> {
  return startcoFetch<StartcoPaymentResult>(
    `/developer/invoice/payment/${args.invoiceId}`,
    {
      method: "POST",
      body: JSON.stringify({
        amount: args.amount,
        dateEmitted: args.dateEmitted || today(),
        type: "extras",
        number: args.reference.slice(0, 60),
      }),
    },
  );
}

export { startcoFetch };
