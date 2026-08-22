// Citeste site-ul clientului si extrage text curat, ca sa il dea AI-ului drept context
// cand redacteaza advertorialul. Fara dependinte noi — doar fetch + curatare HTML.
//
// Securitate: URL-ul vine de la client, deci fetch-ul asta e o tinta de SSRF.
// Apararea are doua straturi: (1) respingem hostname-uri care sunt IP-uri sau
// nume evident interne; (2) rezolvam DNS-ul si respingem orice adresa privata,
// loopback, link-local sau mapata IPv6 — asta prinde si trucuri gen 127.0.0.1.nip.io.
// Redirecturile NU se urmeaza automat: fiecare hop trece prin aceleasi verificari.

import { lookup } from "dns/promises";
import { isIP } from "net";

const MAX_CHARS = 6000;
const TIMEOUT_MS = 8000;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

export interface SiteContext {
  url: string;
  title: string;
  description: string;
  text: string;
}

/** Normalizeaza ce a scris clientul ("firma.ro", "www.firma.ro") intr-un URL http(s) valid. */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase();
  // IP-uri literale (v4 sau v6, cu sau fara paranteze) — respinse din start.
  if (isIP(host.replace(/^\[|\]$/g, "")) !== 0) return null;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    !host.includes(".")
  ) {
    return null;
  }

  return parsed.toString();
}

/** True daca adresa e privata / loopback / link-local / rezervata. */
function isPrivateAddress(addr: string): boolean {
  const a = addr.toLowerCase();

  // IPv6 (inclusiv IPv4 mapat: ::ffff:10.0.0.1)
  if (a.includes(":")) {
    if (a === "::" || a === "::1") return true;
    if (a.startsWith("fe80:") || a.startsWith("fc") || a.startsWith("fd")) return true;
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }

  // IPv4
  const parts = a.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return true; // ce nu se parseaza curat nu trece
  }
  const [p0, p1] = parts;
  if (p0 === 0 || p0 === 10 || p0 === 127) return true;
  if (p0 === 169 && p1 === 254) return true; // link-local + cloud metadata
  if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
  if (p0 === 192 && p1 === 168) return true;
  if (p0 === 100 && p1 >= 64 && p1 <= 127) return true; // CGNAT
  return false;
}

/** Rezolva hostname-ul si respinge orice adresa interna. */
async function hostResolvesPublic(hostname: string): Promise<boolean> {
  try {
    const addrs = await lookup(hostname, { all: true, verbatim: true });
    if (addrs.length === 0) return false;
    return addrs.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function extractMeta(html: string, name: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]).trim();
  }
  return "";
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Descarca pagina si extrage titlu, descriere si text.
 * Returneaza null daca site-ul nu raspunde, nu e HTML, e intern sau depaseste
 * limitele — apelantul continua fara context, nu esueaza.
 */
export async function fetchSiteContext(
  rawUrl: string,
): Promise<SiteContext | null> {
  let url = normalizeUrl(rawUrl);
  if (!url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const parsed = new URL(url);
      if (!(await hostResolvesPublic(parsed.hostname))) return null;

      const res = await fetch(url, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          // Unele site-uri servesc 403 fara user-agent de browser.
          "User-Agent":
            "Mozilla/5.0 (compatible; MediaExpresBot/1.0; +https://mediaexpress.ro)",
          Accept: "text/html,application/xhtml+xml",
        },
        cache: "no-store",
      });

      // Redirect: validam manual urmatorul hop, nu il urmam orbeste.
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return null;
        const next = normalizeUrl(new URL(loc, url).toString());
        if (!next) return null;
        url = next;
        continue;
      }

      if (!res.ok) return null;

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("html")) return null;

      const length = Number(res.headers.get("content-length") || 0);
      if (length && length > MAX_BYTES) return null;

      const html = (await res.text()).slice(0, MAX_BYTES);

      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : "";
      const description =
        extractMeta(html, "description") || extractMeta(html, "og:description");

      const text = htmlToText(html).slice(0, MAX_CHARS);
      if (!text && !title && !description) return null;

      return { url, title, description, text };
    }
    return null; // prea multe redirecturi
  } catch {
    // Timeout, DNS, TLS, abort — toate inseamna "fara context", nu eroare fatala.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
