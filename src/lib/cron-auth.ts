import crypto from "crypto";

/**
 * 29.09.2026 — cronurile rulau DOAR din afara (un serviciu extern cu
 * EXTENSION_API_KEY). In admin, o plata din 22.09 avea „reamintirea n-a
 * plecat inca" dupa o saptamana: apelul extern nu mai venea. Acum serverul
 * isi ruleaza singur cronurile (src/instrumentation.ts), cu o cheie interna
 * derivata din SESSION_SECRET — merge si fara EXTENSION_API_KEY in Railway.
 */
export function cheieInternaCron(): string | null {
  const s = process.env.SESSION_SECRET;
  if (!s) return null;
  return crypto.createHmac("sha256", s).update("cron-intern-mediaexpres").digest("hex");
}

export function cronAutorizat(headers: Headers): boolean {
  const ext = process.env.EXTENSION_API_KEY;
  const k = headers.get("x-api-key");
  if (ext && k && k === ext) return true;
  const intern = cheieInternaCron();
  const i = headers.get("x-cron-intern");
  return Boolean(intern && i && i.length === intern.length && crypto.timingSafeEqual(Buffer.from(i), Buffer.from(intern)));
}
