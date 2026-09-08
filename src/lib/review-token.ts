import crypto from "crypto";

// Token semnat pentru pagina de recenzie, trimis in emailul cu raportul final.
//
// Recenzia se cere exact atunci cand omul e cel mai multumit: tocmai a primit
// lista cu cele 50 de linkuri. Daca l-am trimite la un formular unde trebuie
// sa-si scrie iar emailul, jumatate ar abandona — asa ca linkul il identifica
// singur. Acelasi tipar de semnare ca order-token.ts.

const MAX_AGE_DAYS = 90;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

const SEP = "|";

export interface ReviewTokenPayload {
  email: string;
  /** Numele clientului, ca sa nu-l punem sa-l scrie din nou. Poate lipsi. */
  clientName: string;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET lipseste — tokenurile de recenzie nu pot fi semnate in productie");
    }
    return "dev-secret-change-in-production-please-32-chars";
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function signReviewToken(data: ReviewTokenPayload): string {
  const expires = Date.now() + MAX_AGE_MS;
  // `|` nu apare in emailuri; numele il curatam de el ca sa nu rupa payloadul.
  const payload = [data.email, data.clientName.replace(/\|/g, " "), expires].join(SEP);
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function verifyReviewToken(token: string | undefined): ReviewTokenPayload | null {
  if (!token) return null;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString();
  } catch {
    return null;
  }

  const expected = sign(payload);
  if (
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }

  // Numele poate fi gol, emailul nu.
  const [email, clientName, expiresStr] = payload.split(SEP);
  if (!email || clientName === undefined || !expiresStr) return null;

  const expires = parseInt(expiresStr, 10);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;

  return { email, clientName };
}
