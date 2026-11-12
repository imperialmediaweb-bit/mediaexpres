import crypto from "crypto";
import { SITE } from "@/data/site";

/**
 * 12.11.2026 — linkul de raport al clientului, MEREU pe mediaexpress.ro
 * (proprietarul: „întotdeauna linkul de la raport să fie mediaexpres").
 * Se face din id-ul comenzii, imediat ce comanda există (card sau OP), deci
 * clientul îl primește înainte să înceapă publicarea. Nu expiră și nu se
 * poate ghici din id.
 */
function secret(): string {
  return process.env.SESSION_SECRET || "dev-secret-change-in-production-please-32-chars";
}

function semnatura(id: string): string {
  return crypto.createHmac("sha256", secret()).update(`raport-me:${id}`).digest("hex").slice(0, 20);
}

export function raportToken(submissionId: string): string {
  return `${submissionId}.${semnatura(submissionId)}`;
}

export function raportUrl(submissionId: string): string {
  return `${SITE.url}/raport/${raportToken(submissionId)}`;
}

export function idDinRaportToken(token: string): string | null {
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const id = token.slice(0, i);
  const sig = token.slice(i + 1);
  const ok = semnatura(id);
  if (sig.length !== ok.length) return null;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(ok)) ? id : null;
}
