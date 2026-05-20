import crypto from "crypto";

// Token semnat per prospect — folosit pentru linkurile publice /oferta/[token] și /materiale/[token].
// Reutilizează pattern-ul de signing din `src/lib/auth.ts`.

const MAX_AGE_DAYS = 90;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

function getSecret(): string {
  return process.env.SESSION_SECRET || "dev-secret-change-in-production-please-32-chars";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function signProspectToken(prospectId: string): string {
  const expires = Date.now() + MAX_AGE_MS;
  const payload = `${prospectId}.${expires}`;
  const signature = sign(payload);
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export function verifyProspectToken(token: string | undefined): { prospectId: string } | null {
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
  if (expected !== signature) return null;
  const [prospectId, expiresStr] = payload.split(".");
  if (!prospectId || !expiresStr) return null;
  const expires = parseInt(expiresStr, 10);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;
  return { prospectId };
}
