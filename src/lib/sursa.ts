/**
 * De unde vine fiecare client: căutare Google, ChatGPT, o reclamă pe Facebook,
 * alt site, direct. Aceeași logică folosită pe Media Chief (lib/source.ts).
 *
 * The first page opened stores the source in a cookie (`me_src`, 90 days).
 * When the client orders, the server reads the cookie and writes it on the
 * order; for card checkouts it travels through the Stripe metadata.
 *
 * An ad click (gclid, fbclid, utm) always overwrites — it is the latest and
 * the one that cost money. A referrer or a direct visit never erases a source
 * already stored: someone who came from Google yesterday and typed the address
 * today still belongs to Google.
 *
 * Stored as `source|medium|campaign`, safe characters only.
 */

export const SOURCE_COOKIE = "me_src";
export const SOURCE_DAYS = 90;

export interface Source {
  source: string;
  medium: string;
  campaign: string;
}

function clean(v: string | null | undefined, max = 40): string {
  return (v || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, max);
}

function isOwnHost(host: string): boolean {
  return (
    host === "" ||
    host === "localhost" ||
    host.startsWith("127.") ||
    host.endsWith("mediaexpress.ro") ||
    host.endsWith("mediaexpres.ro") ||
    host.endsWith(".railway.app") ||
    // Stripe's checkout page sends people back to us.
    host.endsWith("stripe.com")
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

const REFERRERS: [RegExp, string, string][] = [
  [/(^|\.)google\./, "google", "organic"],
  [/(^|\.)bing\.com$/, "bing", "organic"],
  [/(^|\.)(duckduckgo\.com|yahoo\.com|yandex\.[a-z]+|ecosia\.org|brave\.com)$/, "search", "organic"],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, "chatgpt", "ai"],
  [/(^|\.)perplexity\.ai$/, "perplexity", "ai"],
  [/(^|\.)gemini\.google\.com$/, "gemini", "ai"],
  [/(^|\.)claude\.ai$/, "claude", "ai"],
  [/(^|\.)copilot\.microsoft\.com$/, "copilot", "ai"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, "facebook", "social"],
  [/(^|\.)instagram\.com$/, "instagram", "social"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin", "social"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "x", "social"],
  [/(^|\.)reddit\.com$/, "reddit", "social"],
  [/(^|\.)youtube\.com$/, "youtube", "social"],
];

/**
 * The source of a page view, from its query string and referrer. `overwrite`
 * is true for an ad click or a UTM link. Null when there is nothing to store
 * (navigation inside the site).
 */
export function sourceFromUrl(
  search: string,
  referrer: string,
): { source: Source; overwrite: boolean } | null {
  const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const utmSource = clean(p.get("utm_source"));
  const utmMedium = clean(p.get("utm_medium"));
  const utmCampaign = clean(p.get("utm_campaign"), 60);

  if (p.get("gclid") || p.get("gbraid") || p.get("wbraid")) {
    return { source: { source: "google", medium: "cpc", campaign: utmCampaign }, overwrite: true };
  }
  if (p.get("fbclid")) {
    return {
      source: {
        source: utmSource === "instagram" || utmSource === "ig" ? "instagram" : "facebook",
        medium: utmMedium || "paid",
        campaign: utmCampaign,
      },
      overwrite: true,
    };
  }
  if (utmSource) {
    return {
      source: { source: utmSource, medium: utmMedium || "referral", campaign: utmCampaign },
      overwrite: true,
    };
  }
  // ChatGPT adds utm_source=chatgpt.com; handled above. Without it, the referrer.
  const host = hostOf(referrer);
  if (host && !isOwnHost(host)) {
    for (const [re, source, medium] of REFERRERS) {
      if (re.test(host)) return { source: { source, medium, campaign: "" }, overwrite: false };
    }
    return { source: { source: clean(host, 60), medium: "referral", campaign: "" }, overwrite: false };
  }
  if (!host) return { source: { source: "direct", medium: "none", campaign: "" }, overwrite: false };
  return null;
}

export function serializeSource(s: Source): string {
  return [clean(s.source, 60), clean(s.medium), clean(s.campaign, 60)].join("|");
}

export function parseSource(v: string | null | undefined): Source | null {
  if (!v || v.length > 200 || !/^[a-z0-9._|-]*$/.test(v)) return null;
  const [source = "", medium = "", campaign = ""] = v.split("|");
  if (!source) return null;
  return { source, medium, campaign };
}

export function sourceFromCookieHeader(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SOURCE_COOKIE}=([^;]*)`));
  if (!m) return null;
  let raw = m[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep as is */
  }
  const s = parseSource(raw);
  return s ? serializeSource(s) : null;
}

/** The source of an HTTP request (order form, checkout), ready for the database. */
export function sourceFromRequest(req: Request): string | null {
  return sourceFromCookieHeader(req.headers.get("cookie"));
}

/** How the admin shows it: "Google search", "Facebook Ads", "ChatGPT"… */
export function sourceLabel(v: string | null | undefined): string {
  if (v === "manual") return "Adăugat manual";
  const s = parseSource(v);
  if (!s) return "Necunoscut";
  const paid = s.medium === "cpc" || s.medium === "paid";
  const names: Record<string, string> = {
    google: s.medium === "cpc" ? "Google Ads" : "Căutare Google",
    bing: "Căutare Bing",
    search: "Alt motor de căutare",
    chatgpt: "ChatGPT",
    perplexity: "Perplexity",
    gemini: "Gemini",
    claude: "Claude",
    copilot: "Copilot",
    facebook: paid ? "Facebook Ads" : "Facebook (postare / pagină)",
    instagram: paid ? "Instagram Ads" : "Instagram",
    linkedin: "LinkedIn",
    x: "X / Twitter",
    reddit: "Reddit",
    youtube: "YouTube",
    direct: "Direct (scris în bară / email / chat)",
    email: "Email",
  };
  const name =
    names[s.source] ??
    (s.source.includes("chatgpt")
      ? "ChatGPT"
      : s.medium === "referral"
        ? `Link pe ${s.source}`
        : `${s.source} (${s.medium})`);
  return s.campaign ? `${name} — ${s.campaign}` : name;
}

/** Only a paid click is "ad"; everything else is free traffic. */
export function isAdSource(v: string | null | undefined): boolean {
  const s = parseSource(v);
  return !!s && (s.medium === "cpc" || s.medium === "paid");
}
