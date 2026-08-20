// Citeste site-ul clientului si extrage text curat, ca sa il dea AI-ului drept context
// cand redacteaza advertorialul. Fara dependinte noi — doar fetch + curatare HTML.

const MAX_CHARS = 6000;
const TIMEOUT_MS = 8000;
const MAX_BYTES = 2_000_000;

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

  // Blocheaza adrese interne — fara asta, endpointul devine un SSRF catre reteaua proprie.
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  ) {
    return null;
  }
  if (!host.includes(".")) return null;

  return parsed.toString();
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
 * Returneaza null daca site-ul nu raspunde, nu e HTML sau depaseste limitele —
 * apelantul trebuie sa continue fara context, nu sa esueze.
 */
export async function fetchSiteContext(
  rawUrl: string,
): Promise<SiteContext | null> {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Unele site-uri servesc 403 fara user-agent de browser.
        "User-Agent":
          "Mozilla/5.0 (compatible; MediaExpresBot/1.0; +https://mediaexpress.ro)",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

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
  } catch {
    // Timeout, DNS, TLS, abort — toate inseamna "fara context", nu eroare fatala.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
