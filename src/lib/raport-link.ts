import crypto from "crypto";
import { SITE } from "@/data/site";

/**
 * Linkul de raport pe care clientul il primeste pe email: fara autentificare,
 * nu expira niciodata si nu poate fi ghicit din id-ul articolului.
 *
 * Pana acum emailul de publicare trimitea in cont, deci clientul trebuia sa-si
 * aminteasca parola ca sa vada unde i-a aparut articolul. Semnatura HMAC face
 * linkul public fara sa deschida nimic altceva.
 */
function getSecret(): string {
  return process.env.SESSION_SECRET || "dev-secret-change-in-production-please-32-chars";
}

function sign(articleId: string): string {
  return crypto.createHmac("sha256", getSecret()).update(`raport:${articleId}`).digest("hex").slice(0, 20);
}

export function raportToken(articleId: string): string {
  return `${articleId}.${sign(articleId)}`;
}

export function raportUrl(articleId: string): string {
  return `${SITE.url}/raport/${raportToken(articleId)}`;
}

export function articleIdFromToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(id);
  if (sig.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? id : null;
}
