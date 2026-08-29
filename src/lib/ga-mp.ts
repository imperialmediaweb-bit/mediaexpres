import { createHash } from "crypto";

/**
 * GA4 Measurement Protocol — evenimente trimise de pe SERVER.
 *
 * De ce exista: cumparatorul cu plata unica nu vede nicio pagina masurabila —
 * /comanda/multumim il redirectioneaza instant spre formularul de articol,
 * deci un `purchase` din browser nu are unde sa se intample. Singurul loc
 * care stie sigur ca banii au intrat e webhookul Stripe, iar de acolo GA se
 * anunta doar prin Measurement Protocol.
 *
 * Acelasi contract ca meta-capi: best-effort, nu arunca niciodata, se
 * dezactiveaza singur cand lipsesc cheile. Analytics e bonus, incasarea e
 * obligatia.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-J48G1PDG1E";
// Secretul se creeaza in GA: Admin -> Data Streams -> Measurement Protocol
// API secrets. Fara el, functia tace — nu exista mod de a trimite fara secret.
const GA_API_SECRET = process.env.GA_API_SECRET;

export interface GaPurchase {
  /** Id-ul sesiunii Stripe — devine transaction_id, deci retry-urile se dedup. */
  sessionId: string;
  value: number;
  currency?: string;
  /**
   * client_id-ul GA al cumparatorului, salvat la checkout din cookie-ul _ga
   * (acelasi drum ca fbp/fbc prin metadata Stripe). Cu el, purchase-ul se
   * leaga de sesiunea si campania care l-au adus. Fara el, folosim un id
   * derivat din sesiunea Stripe: evenimentul se numara, dar fara atribuire.
   */
  clientId?: string;
  itemName?: string;
}

export interface GaMpResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * Extrage client_id-ul GA din antetul Cookie al unei cereri de browser.
 * Formatul cookie-ului _ga e "GA1.1.111111111.2222222222" — client_id e
 * partea "111111111.2222222222" (ultimele doua segmente).
 */
export function extractGaClientId(req: Request): string | undefined {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/_ga=GA\d+\.\d+\.(\d+\.\d+)/);
  return m?.[1];
}

export async function sendGaPurchase(p: GaPurchase): Promise<GaMpResult> {
  if (!GA_ID || !GA_API_SECRET) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ga-mp] dezactivat (lipseste GA_API_SECRET)");
    }
    return { ok: false, skipped: true };
  }

  // Fallback stabil: acelasi session id -> acelasi client_id, deci nici macar
  // fara cookie un retry de webhook nu produce doi "clienti" diferiti.
  const clientId =
    p.clientId ||
    (() => {
      const h = createHash("sha256").update(p.sessionId).digest();
      return `${h.readUInt32BE(0)}.${h.readUInt32BE(4)}`;
    })();

  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA_ID}&api_secret=${GA_API_SECRET}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          events: [
            {
              name: "purchase",
              params: {
                transaction_id: p.sessionId,
                value: p.value,
                currency: p.currency || "RON",
                items: [{ item_name: p.itemName || "publicare-articol", quantity: 1 }],
              },
            },
          ],
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
    // MP intoarce 2xx si pentru payloaduri gresite — validarea reala se face
    // o singura data, manual, pe /debug/mp/collect. Aici ne intereseaza doar
    // ca cererea a plecat.
    return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
