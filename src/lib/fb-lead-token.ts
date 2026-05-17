import crypto from "crypto";

const TTL_MS = 90 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  return process.env.SESSION_SECRET || "dev-secret-change-in-production-please-32-chars";
}

export interface FbLeadPayload {
  name: string;
  email: string;
  phone: string;
  expires: number;
}

export function signFbLeadToken(lead: { name: string; email: string; phone: string }): string {
  const expires = Date.now() + TTL_MS;
  const payload: FbLeadPayload = { ...lead, expires };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(payloadStr).digest("hex");
  return `${payloadStr}.${sig}`;
}

export function verifyFbLeadToken(token: string): FbLeadPayload | null {
  if (!token) return null;
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return null;
  const payloadB64 = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  if (!payloadB64 || !sig) return null;
  const expected = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("hex");
  if (expected !== sig) return null;
  let payload: FbLeadPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  } catch {
    return null;
  }
  if (Date.now() > payload.expires) return null;
  return payload;
}
