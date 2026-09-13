import { unzipSync } from "fflate";

/**
 * Citirea unui fisier Word (.docx): textul, linkurile puse pe cuvinte si
 * pozele din el.
 *
 * 13.09.2026 — un client (ART JUNKIE) a spus ca „a pus pozele": le pusese in
 * documentul Word, langa text. La lipire in caseta de text ajung doar
 * cuvintele; pozele si adresele de sub linkuri raman in Word, iar comanda
 * soseste „Imagini (0/3)" si fara ancore. Nu e vina lui — asa lucreaza
 * oamenii, in Word. Deci luam noi documentul si scoatem tot din el.
 *
 * Un .docx e o arhiva ZIP: `word/document.xml` (textul, cu linkurile ca
 * `w:hyperlink r:id=…` si pozele ca `a:blip r:embed=…`),
 * `word/_rels/document.xml.rels` (id → adresa sau fisier) si `word/media/*`
 * (pozele). Citim cu expresii regulate, nu cu un parser XML: structura de
 * care avem nevoie e mica si stabila, iar un parser intreg ar fi mai mult
 * cod decat toata functia asta.
 */

export interface DocxLink {
  /** Cuvintele pe care e pus linkul (ancora), asa cum apar in document. */
  text: string;
  url: string;
}

export interface DocxImage {
  /** Numele fisierului din arhiva (ex. image1.jpeg). */
  name: string;
  mime: string;
  data: Uint8Array;
}

export interface DocxContinut {
  /** Primul paragraf, daca arata a titlu (scurt, fara punct final). Altfel "". */
  title: string;
  /** Paragrafele, despartite de un rand gol. */
  body: string;
  links: DocxLink[];
  /** Pozele, in ordinea aparitiei in document; formatele pe care le putem publica. */
  images: DocxImage[];
}

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function decodeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Textul dintr-un fragment de paragraf: w:t + w:br + w:tab, restul se ignora. */
function textDin(xml: string): string {
  let out = "";
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:t(?:\s[^>]*)?\/>|<w:br\s*\/>|<w:cr\s*\/>|<w:tab\s*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (m[0].startsWith("<w:br") || m[0].startsWith("<w:cr")) out += "\n";
    else if (m[0].startsWith("<w:tab")) out += " ";
    else if (m[1] !== undefined) out += decodeXml(m[1]);
  }
  return out;
}

function relatii(xml: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!xml) return map;
  const re = /<Relationship\b([^>]*)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const attrs = m[1];
    const id = /\bId="([^"]+)"/.exec(attrs)?.[1];
    const target = /\bTarget="([^"]+)"/.exec(attrs)?.[1];
    if (id && target) map.set(id, decodeXml(target));
  }
  return map;
}

function decodor(): (b: Uint8Array) => string {
  const td = new TextDecoder("utf-8");
  return (b) => td.decode(b);
}

/** Un titlu e scurt, pe un singur rand si nu se termina cu punct. */
export function paraArataATitlu(p: string): boolean {
  const t = p.trim();
  if (!t || t.length > 160 || t.includes("\n")) return false;
  if (t.split(/\s+/).length > 22) return false;
  return !/[.;:]$/.test(t);
}

export function citesteDocx(fisier: Uint8Array | ArrayBuffer | Buffer): DocxContinut {
  const bytes = fisier instanceof Uint8Array ? fisier : new Uint8Array(fisier);
  let arhiva: Record<string, Uint8Array>;
  try {
    arhiva = unzipSync(bytes);
  } catch {
    throw new Error("Fișierul nu e un document Word (.docx) valid.");
  }
  const doc = arhiva["word/document.xml"];
  if (!doc) throw new Error("Fișierul nu e un document Word (.docx) valid.");
  const txt = decodor();
  const xml = txt(doc);
  const rels = relatii(arhiva["word/_rels/document.xml.rels"] && txt(arhiva["word/_rels/document.xml.rels"]));

  const paragrafe: string[] = [];
  const links: DocxLink[] = [];
  const imagini: DocxImage[] = [];
  const pozeVazute = new Set<string>();

  const bodyXml = /<w:body>([\s\S]*?)<\/w:body>/.exec(xml)?.[1] ?? xml;
  const reP = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = reP.exec(bodyXml))) {
    const pXml = m[1];

    // Linkurile: ancora = textul din interiorul w:hyperlink; adresa din rels.
    const reH = /<w:hyperlink\b([^>]*)>([\s\S]*?)<\/w:hyperlink>/g;
    let h: RegExpExecArray | null;
    while ((h = reH.exec(pXml))) {
      const id = /\br:id="([^"]+)"/.exec(h[1])?.[1];
      const url = id ? rels.get(id) : undefined;
      const text = textDin(h[2]).replace(/\s+/g, " ").trim();
      if (url && text && /^https?:\/\//i.test(url) && !links.some((l) => l.url === url && l.text === text)) {
        links.push({ text, url });
      }
    }

    // Pozele: a:blip r:embed=rIdN → rels → word/media/…
    const reB = /<a:blip\b[^>]*\br:embed="([^"]+)"/g;
    let b: RegExpExecArray | null;
    while ((b = reB.exec(pXml))) {
      const target = rels.get(b[1]);
      if (!target) continue;
      const cale = target.startsWith("/") ? target.slice(1) : `word/${target.replace(/^\.\//, "")}`;
      if (pozeVazute.has(cale)) continue;
      pozeVazute.add(cale);
      const data = arhiva[cale];
      const ext = cale.split(".").pop()?.toLowerCase() || "";
      if (data && MIME[ext]) {
        imagini.push({ name: cale.split("/").pop() || cale, mime: MIME[ext], data });
      }
    }

    const text = textDin(pXml).replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
    if (text) paragrafe.push(text);
  }

  // Poze puse in document fara a:blip (rar — obiecte vechi): le luam din media, in ordine.
  if (imagini.length === 0) {
    for (const cale of Object.keys(arhiva).filter((k) => k.startsWith("word/media/")).sort()) {
      const ext = cale.split(".").pop()?.toLowerCase() || "";
      if (MIME[ext]) imagini.push({ name: cale.split("/").pop() || cale, mime: MIME[ext], data: arhiva[cale] });
    }
  }

  let title = "";
  if (paragrafe.length > 1 && paraArataATitlu(paragrafe[0])) {
    title = paragrafe.shift()!.trim();
  }

  return { title, body: paragrafe.join("\n\n"), links, images: imagini };
}

/** „ancoră → adresă", o linie pe link — forma din campul „Linkurile dorite". */
export function linkuriCaNote(links: DocxLink[]): string {
  return links.map((l) => `${l.text} → ${l.url}`).join("\n");
}
