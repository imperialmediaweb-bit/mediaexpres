/**
 * De unde a venit omul: Google Ads, Facebook, cautare organica, ChatGPT,
 * direct.
 *
 * Reclamele costa bani in fiecare zi si intrebarea „care aduce comenzi?"
 * n-avea raspuns: Meta si Google isi numara fiecare conversiile, dar in admin,
 * langa comanda, nu scria nimic. Iar cine ne scrie pe WhatsApp nu trece prin
 * niciun pixel — ala era complet invizibil.
 *
 * Cum merge: la prima pagina deschisa, browserul retine sursa intr-un cookie
 * (`me_src`), 90 de zile. Cand omul comanda, oricum ar comanda — card, transfer,
 * chat — serverul citeste cookie-ul si il scrie langa comanda. Cand apasa pe
 * WhatsApp, mesajul pre-scris primeste o propozitie in plus („Am văzut oferta
 * pe Google.”), asa ca si leadurile de acolo isi spun singure sursa.
 *
 * Regula de suprascriere: un click de reclama (gclid, fbclid, utm) castiga
 * mereu — e cel mai recent si cel care a costat. Un referrer sau o intrare
 * directa NU sterg o sursa deja retinuta: omul care a venit ieri din reclama si
 * azi a tastat adresa e tot al reclamei.
 *
 * Format in cookie si in baza: `sursa|mediu|campanie`, doar caractere sigure.
 */

export const SURSA_COOKIE = "me_src";
/** 90 de zile, cat dureaza de obicei o decizie de cumparare la o firma mica. */
export const SURSA_ZILE = 90;

export interface Sursa {
  source: string;
  medium: string;
  campaign: string;
}

/** Ce poate contine fiecare parte: fara `|`, fara `;`, fara spatii ciudate. */
function curata(v: string | null | undefined, max = 40): string {
  return (v || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, max);
}

/** Gazda proprie si localhost nu sunt „surse" — e navigare in site. */
function eGazdaProprie(host: string): boolean {
  return (
    host === "" ||
    host === "localhost" ||
    host.startsWith("127.") ||
    host.endsWith("mediaexpress.ro") ||
    host.endsWith(".railway.app")
  );
}

function gazdaDin(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Sursa dedusa dintr-un URL deschis si din referrer.
 *
 * Intoarce `{ sursa, suprascrie }`: `suprascrie` e true cand a fost un click
 * platit sau cu UTM — atunci inlocuim ce era in cookie. Null cand nu e nimic
 * de retinut (navigare in site).
 */
export function sursaDinUrl(
  search: string,
  referrer: string,
): { sursa: Sursa; suprascrie: boolean } | null {
  const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const utmSource = curata(p.get("utm_source"));
  const utmMedium = curata(p.get("utm_medium"));
  const utmCampaign = curata(p.get("utm_campaign"), 60);

  // 1. Click de reclama sau link cu UTM: sursa cea mai sigura, o retinem mereu.
  if (p.get("gclid") || p.get("gbraid") || p.get("wbraid")) {
    return {
      sursa: { source: "google", medium: "cpc", campaign: utmCampaign },
      suprascrie: true,
    };
  }
  if (p.get("fbclid")) {
    return {
      sursa: {
        source: utmSource === "instagram" || utmSource === "ig" ? "instagram" : "facebook",
        medium: utmMedium || "paid",
        campaign: utmCampaign,
      },
      suprascrie: true,
    };
  }
  if (utmSource) {
    return {
      sursa: { source: utmSource, medium: utmMedium || "referral", campaign: utmCampaign },
      suprascrie: true,
    };
  }

  // 2. Referrer: de unde a dat click, fara sa fie neaparat reclama.
  const host = gazdaDin(referrer);
  if (host && !eGazdaProprie(host)) {
    if (/(^|\.)google\./.test(host)) {
      return { sursa: { source: "google", medium: "organic", campaign: "" }, suprascrie: false };
    }
    if (/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/.test(host)) {
      return { sursa: { source: "facebook", medium: "social", campaign: "" }, suprascrie: false };
    }
    if (/(^|\.)instagram\.com$/.test(host)) {
      return { sursa: { source: "instagram", medium: "social", campaign: "" }, suprascrie: false };
    }
    if (/(^|\.)(chatgpt\.com|openai\.com)$/.test(host)) {
      return { sursa: { source: "chatgpt", medium: "referral", campaign: "" }, suprascrie: false };
    }
    if (/(^|\.)bing\.com$/.test(host)) {
      return { sursa: { source: "bing", medium: "organic", campaign: "" }, suprascrie: false };
    }
    return { sursa: { source: curata(host, 60), medium: "referral", campaign: "" }, suprascrie: false };
  }

  // 3. Nimic: a tastat adresa, a dat click intr-un email sau intr-un chat.
  if (!host) {
    return { sursa: { source: "direct", medium: "none", campaign: "" }, suprascrie: false };
  }
  return null;
}

export function serializeazaSursa(s: Sursa): string {
  return [curata(s.source, 60), curata(s.medium), curata(s.campaign, 60)].join("|");
}

/** Din cookie sau din baza. Null daca textul nu e in formatul nostru. */
export function parseazaSursa(v: string | null | undefined): Sursa | null {
  if (!v || v.length > 200 || !/^[a-z0-9._|-]*$/.test(v)) return null;
  const [source = "", medium = "", campaign = ""] = v.split("|");
  if (!source) return null;
  return { source, medium, campaign };
}

/** Valoarea cookie-ului `me_src` dintr-un header Cookie brut. */
export function sursaDinCookieHeader(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SURSA_COOKIE}=([^;]*)`));
  if (!m) return null;
  let raw = m[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* ramane cum e */
  }
  const s = parseazaSursa(raw);
  return s ? serializeazaSursa(s) : null;
}

/** Sursa dintr-o cerere HTTP (checkout, transfer, articol) — gata de scris in baza. */
export function sursaDinCerere(req: Request): string | null {
  return sursaDinCookieHeader(req.headers.get("cookie"));
}

/**
 * Cum se vede in admin. Scurt, in romana, fara jargon: „Google Ads”, nu
 * „google/cpc”. Campania (daca e) vine dupa, in paranteza.
 */
export function etichetaSursa(v: string | null | undefined): string {
  if (v === "manual") return "adăugată manual";
  const s = parseazaSursa(v);
  if (!s) return "necunoscută";
  let nume: string;
  switch (s.source) {
    case "google":
      nume = s.medium === "cpc" ? "Google Ads" : "Google (căutare)";
      break;
    case "facebook":
      nume = s.medium === "paid" || s.medium === "cpc" ? "Facebook Ads" : "Facebook";
      break;
    case "instagram":
      nume = s.medium === "paid" || s.medium === "cpc" ? "Instagram Ads" : "Instagram";
      break;
    case "chatgpt":
      nume = "ChatGPT";
      break;
    case "bing":
      nume = "Bing";
      break;
    case "direct":
      nume = "Direct (adresă tastată / email / chat)";
      break;
    case "email":
      nume = "Email";
      break;
    case "whatsapp":
      nume = "WhatsApp";
      break;
    default:
      nume = s.medium === "referral" ? `Link de pe ${s.source}` : `${s.source} (${s.medium})`;
  }
  return s.campaign ? `${nume} — ${s.campaign}` : nume;
}

/**
 * Propozitia care intra in mesajul de WhatsApp. Naturala, ca sa nu para un
 * cod de urmarire; clientul o poate sterge, dar de obicei n-o face.
 */
export function propozitieSursaWhatsApp(v: string | null | undefined): string {
  const s = parseazaSursa(v);
  if (!s) return "";
  switch (s.source) {
    case "google":
      return "Am văzut oferta pe Google.";
    case "facebook":
      return "Am văzut oferta pe Facebook.";
    case "instagram":
      return "Am văzut oferta pe Instagram.";
    case "chatgpt":
      return "Am găsit oferta prin ChatGPT.";
    case "bing":
      return "Am văzut oferta pe Bing.";
    default:
      return "";
  }
}

/** Cookie-ul curent din browser (doar pe client). */
export function citesteSursaDinBrowser(): string | null {
  if (typeof document === "undefined") return null;
  return sursaDinCookieHeader(document.cookie);
}
