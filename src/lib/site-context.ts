// Citeste site-ul clientului si extrage text curat, ca sa il dea AI-ului drept context
// cand redacteaza advertorialul. Fara dependinte noi — node:http(s) + curatare HTML.
//
// Securitate: URL-ul vine de la client, deci fetch-ul asta e o tinta de SSRF.
// Cererea se face prin node:http(s) cu un `lookup` custom care valideaza adresa
// IP CHIAR LA MOMENTUL CONEXIUNII — nu inainte. Asta inchide si DNS rebinding
// (TOCTOU): nu exista o a doua rezolvare pe care atacatorul sa o poata schimba.
// Redirecturile nu se urmeaza automat: fiecare hop trece prin acelasi lookup.

import { lookup as dnsLookup } from "dns";
import { isIP } from "net";
import http from "http";
import https from "https";

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
export function isPrivateAddress(addr: string): boolean {
  const a = addr.toLowerCase();

  // IPv6 (inclusiv IPv4 mapat: ::ffff:10.0.0.1)
  if (a.includes(":")) {
    if (a === "::" || a === "::1") return true;
    // fc00::/7 (ULA)
    if (a.startsWith("fc") || a.startsWith("fd")) return true;
    // fe80::/10 = fe80: pana la febf:
    const m6 = a.match(/^fe([89ab])[0-9a-f]:/);
    if (m6) return true;
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }

  // IPv4
  const parts = a.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return true; // ce nu se parseaza curat nu trece
  }
  const [p0, p1, p2] = parts;
  if (p0 === 0 || p0 === 10 || p0 === 127) return true;
  if (p0 >= 224) return true; // multicast + rezervat
  if (p0 === 169 && p1 === 254) return true; // link-local + cloud metadata
  if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
  if (p0 === 192 && p1 === 168) return true;
  if (p0 === 192 && p1 === 0 && p2 === 0) return true; // 192.0.0.0/24
  if (p0 === 192 && p1 === 0 && p2 === 2) return true; // TEST-NET-1
  if (p0 === 198 && (p1 === 18 || p1 === 19)) return true; // 198.18.0.0/15 benchmarking
  if (p0 === 100 && p1 >= 64 && p1 <= 127) return true; // CGNAT
  return false;
}

// `lookup` custom pentru http.request: rezolva si REFUZA adresele private in
// acelasi pas cu conexiunea — atacatorul nu are o fereastra intre verificare
// si conectare.
const safeLookup: typeof dnsLookup = ((hostname: string, options: unknown, callback: unknown) => {
  const cb = (typeof options === "function" ? options : callback) as (
    err: NodeJS.ErrnoException | null,
    address?: string | { address: string; family: number }[],
    family?: number,
  ) => void;
  const opts = typeof options === "object" && options !== null ? options : {};

  dnsLookup(hostname, { ...opts, all: true, verbatim: true }, (err, addresses) => {
    if (err) return cb(err);
    const list = (addresses as { address: string; family: number }[]) || [];
    const publicOnly = list.filter((a) => !isPrivateAddress(a.address));
    if (publicOnly.length === 0 || publicOnly.length !== list.length) {
      // Orice adresa privata in raspuns = refuz total, nu doar filtrare —
      // altfel un DNS care alterneaza raspunsurile tot ar putea strecura una.
      const e = new Error("adresa interna refuzata") as NodeJS.ErrnoException;
      e.code = "EPRIVATE";
      return cb(e);
    }
    const first = publicOnly[0];
    if ((opts as { all?: boolean }).all) return cb(null, publicOnly);
    cb(null, first.address, first.family);
  });
}) as typeof dnsLookup;

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

/** GET cu lookup sigur, timeout si limita de marime. Fara redirecturi automate. */
function safeGet(url: string, signal: AbortSignal): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;
    const req = mod.request(
      parsed,
      {
        method: "GET",
        lookup: safeLookup,
        headers: {
          // Unele site-uri servesc 403 fara user-agent de browser.
          "User-Agent":
            "Mozilla/5.0 (compatible; MediaExpresBot/1.0; +https://mediaexpress.ro)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            res.destroy();
            resolve({
              status: res.statusCode || 0,
              headers: res.headers,
              body: Buffer.concat(chunks).toString("utf8"),
            });
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
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
      const res = await safeGet(url, controller.signal);

      // Redirect: validam manual urmatorul hop, nu il urmam orbeste.
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.location;
        if (!loc) return null;
        const next = normalizeUrl(new URL(loc, url).toString());
        if (!next) return null;
        url = next;
        continue;
      }

      if (res.status < 200 || res.status >= 300) return null;

      const contentType = res.headers["content-type"] || "";
      if (!contentType.includes("html")) return null;

      const html = res.body.slice(0, MAX_BYTES);

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
    // Timeout, DNS, TLS, EPRIVATE, abort — toate inseamna "fara context".
    return null;
  } finally {
    clearTimeout(timer);
  }
}
