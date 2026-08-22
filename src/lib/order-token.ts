import crypto from "crypto";

// Token semnat emis dupa o plata Stripe reusita.
// Da acces la /articol/[token] — pagina unde clientul isi trimite articolul si pozele,
// fara sa aiba nevoie de cont. Acelasi pattern de signing ca prospect-token.ts.

const MAX_AGE_DAYS = 90;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

const SEP = "|";

export interface OrderTokenPayload {
  sessionId: string;
  email: string;
  packageId: string;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // In productie refuzam sa functionam cu secretul de dev din repo:
    // oricine citeste codul ar putea falsifica tokenuri de comanda platita.
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET lipseste — tokenurile de comanda nu pot fi semnate in productie");
    }
    return "dev-secret-change-in-production-please-32-chars";
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function signOrderToken(data: OrderTokenPayload): string {
  const expires = Date.now() + MAX_AGE_MS;
  // `|` nu apare in id-uri Stripe, emailuri sau id-uri de pachet.
  const payload = [data.sessionId, data.email, data.packageId, expires].join(SEP);
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function verifyOrderToken(
  token: string | undefined,
): OrderTokenPayload | null {
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
  // Comparatie in timp constant — lungimi diferite ar arunca din timingSafeEqual.
  if (
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }

  const [sessionId, email, packageId, expiresStr] = payload.split(SEP);
  if (!sessionId || !email || !packageId || !expiresStr) return null;

  const expires = parseInt(expiresStr, 10);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;

  return { sessionId, email, packageId };
}
