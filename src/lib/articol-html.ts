/**
 * Articolul gata de pus pe site, cu linkurile deja pe cuvinte.
 *
 * 29.09.2026 — cerut de proprietar: publicatia partenera sa poata copia
 * articolul direct cu linkurile, sau HTML-ul, sau sa-l descarce, plus pozele.
 * Pana acum vedea text simplu si o lista „ancora → adresa" si punea singura
 * linkurile, cu riscul sa le puna gresit sau deloc.
 */

/** Domeniul dintr-o adresa (local: fisierul se foloseste si in browser). */
function domeniuDin(url: string): string | null {
  const t = (url || "").trim();
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    return /\./.test(h) ? h : null;
  } catch {
    return null;
  }
}

export interface LinkCerut {
  ancora: string | null;
  url: string;
}

const URL_RE = /https?:\/\/[^\s"'<>]+/i;

/** Citeste campul „Linkurile dorite": o linie pe link, „ancora → adresa". */
export function parseazaLinkuri(note: string | null | undefined): LinkCerut[] {
  if (!note) return [];
  const out: LinkCerut[] = [];
  for (const linie of note.split(/\r?\n/)) {
    const m = linie.match(URL_RE);
    if (!m) continue;
    const url = m[0].replace(/[.,;)]+$/, "");
    const ancora = linie
      .slice(0, m.index)
      .replace(/\s*(→|->|=>|:|–|—|-)\s*$/, "")
      .replace(/^[\s„"'«]+|[\s”"'»]+$/g, "")
      .trim();
    out.push({ ancora: ancora || null, url });
  }
  return out;
}

export function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** O linie scurta, fara punct la final, urmata de text = subtitlu. */
function eSubtitlu(p: string, urmeazaText: boolean): boolean {
  return urmeazaText && !p.includes("\n") && p.length <= 90 && !/[.!?:;,]$/.test(p);
}

export function articolHtml(d: {
  titlu: string;
  corp: string;
  linkNotes?: string | null;
  dofollow?: boolean;
  cuTitlu?: boolean;
}): { html: string; negasite: LinkCerut[] } {
  const paragrafe = d.corp
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocuri = paragrafe.map((p, i) => {
    const text = escHtml(p);
    return eSubtitlu(p, i < paragrafe.length - 1)
      ? { tag: "h2", html: text }
      : { tag: "p", html: text.replace(/\n/g, "<br>") };
  });

  const rel = d.dofollow === false ? ' rel="nofollow"' : "";
  const negasite: LinkCerut[] = [];
  for (const l of parseazaLinkuri(d.linkNotes)) {
    if (!l.ancora) {
      negasite.push(l);
      continue;
    }
    const cautat = escHtml(l.ancora);
    const re = new RegExp(cautat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    // Prima aparitie, intr-un paragraf (nu in subtitlu) si nu deja in alt link.
    const bloc = blocuri.find((b) => b.tag === "p" && re.test(b.html.replace(/<a [^>]*>.*?<\/a>/g, "")));
    if (!bloc) {
      negasite.push(l);
      continue;
    }
    const bucati = bloc.html.split(/(<a [^>]*>.*?<\/a>)/);
    let pus = false;
    bloc.html = bucati
      .map((b) =>
        pus || b.startsWith("<a ")
          ? b
          : b.replace(re, (m) => {
              pus = true;
              return `<a href="${escHtml(l.url)}"${rel}>${m}</a>`;
            }),
      )
      .join("");
  }

  const corp = blocuri.map((b) => `<${b.tag}>${b.html}</${b.tag}>`).join("\n");
  return { html: (d.cuTitlu ? `<h1>${escHtml(d.titlu)}</h1>\n` : "") + corp, negasite };
}

/** Link de descarcare pentru o poza Cloudinary (altfel, adresa ca atare). */
export function linkDescarcarePoza(url: string): string {
  return url.includes("res.cloudinary.com") && url.includes("/upload/") && !url.includes("fl_attachment")
    ? url.replace("/upload/", "/upload/fl_attachment/")
    : url;
}

/** „ancora → adresa", o linie pe link — forma salvata pe comanda. */
export function serializeazaLinkuri(l: { ancora: string; url: string }[]): string {
  return l
    .filter((x) => x.url.trim())
    .map((x) => `${x.ancora.trim()} → ${x.url.trim()}`)
    .join("\n");
}

/** Adresa curata, cu https:// in fata daca lipseste. */
export function normalizeazaUrl(u: string): string {
  const t = (u || "").trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/**
 * 01.10.2026 — „nu stiu unde sa pun linkul" (proprietarul, la comanda NOZOMI).
 * Cand clientul n-a cerut niciun link, punem NOI numele firmei ca link catre
 * site-ul lui — regula scrisa de mult in formular, dar aplicata abia acum
 * automat. Ancora: numele firmei asa cum apare in text; daca numele intreg
 * nu apare („NOZOMI Travel Society"), incercam fara ultimul cuvant („NOZOMI
 * Travel") s.a.m.d. Daca nu-l gasim deloc, ramane numele intreg, iar pagina
 * arata ca nu l-a gasit.
 */
export function linkuriImplicite(d: {
  linkNotes: string | null | undefined;
  companyName: string | null | undefined;
  siteUrl: string | null | undefined;
  body: string;
}): string {
  if (parseazaLinkuri(d.linkNotes).length) return (d.linkNotes || "").trim();
  const url = normalizeazaUrl(d.siteUrl || "");
  const nume = (d.companyName || "").trim();
  if (!url || !nume || !domeniuDin(url)) return (d.linkNotes || "").trim();
  const cuvinte = nume.split(/\s+/);
  const corp = d.body.toLowerCase();
  for (let n = cuvinte.length; n >= 1; n--) {
    const ancora = cuvinte.slice(0, n).join(" ");
    if (ancora.length >= 3 && corp.includes(ancora.toLowerCase())) return `${ancora} → ${url}`;
  }
  return `${nume} → ${url}`;
}
