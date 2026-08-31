import { deflateRawSync, deflateSync } from "node:zlib";
import {
  FONT_ENCODING,
  FONT_GLYPHS,
  FONT_FIRST_CHAR,
  FONT_WIDTHS,
  FONT_WIDTHS_BOLD,
  FONT_METRICS,
  FONT_REGULAR_B64,
  FONT_BOLD_B64,
} from "@/lib/report-font";
import { NEWSPAPERS } from "@/data/newspapers";

/**
 * Generatoare de .xlsx si .pdf fara nicio dependenta noua.
 *
 * Motivul pentru care sunt scrise de mana: proiectul n-are librarie de
 * spreadsheet sau PDF, iar clientul trebuie sa poata descarca raportul din
 * contul lui. Ambele formate sunt construite la minimul strict cerut de
 * specificatie — Excel si orice cititor de PDF le deschid fara reclamatii.
 */

export interface ReportEntry {
  url: string;
  title?: string;
}

// ---------------------------------------------------------------------------
// ZIP (fara compresie) — necesar pentru .xlsx, care e un ZIP de fisiere XML
// ---------------------------------------------------------------------------

let crcTable: number[] | null = null;
function crc32(buf: Buffer): number {
  if (!crcTable) {
    crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Buffer;
}

/** ZIP minimal, cu deflate. Suficient pentru structura unui .xlsx. */
function makeZip(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, "utf8");
    const crc = crc32(e.data);
    const compressed = deflateRawSync(e.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versiune minima
    local.writeUInt16LE(0x0800, 6); // nume in UTF-8
    local.writeUInt16LE(8, 8); // metoda: deflate
    local.writeUInt16LE(0, 10); // ora
    local.writeUInt16LE(0x21, 12); // data (1980-01-01, fix — build reproductibil)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(e.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += 30 + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralBuf, end]);
}

// ---------------------------------------------------------------------------
// XLSX
// ---------------------------------------------------------------------------

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Caracterele de control nu sunt valide in XML 1.0 si strica fisierul.
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

function sheetCell(ref: string, value: string): string {
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

export function buildReportXlsx(args: {
  entries: ReportEntry[];
  clientName?: string | null;
  articleTitle?: string | null;
  date: Date;
}): Buffer {
  const rows: string[] = [];
  let r = 1;

  const meta: [string, string][] = [
    ["Raport de publicare", ""],
    ["Client", args.clientName || "—"],
    ["Campanie", args.articleTitle || "—"],
    ["Data", args.date.toLocaleDateString("ro-RO")],
    ["Publicații", String(args.entries.length)],
  ];
  for (const [k, v] of meta) {
    rows.push(`<row r="${r}">${sheetCell(`A${r}`, k)}${v ? sheetCell(`B${r}`, v) : ""}</row>`);
    r++;
  }
  r++; // rand gol

  rows.push(
    `<row r="${r}">${sheetCell(`A${r}`, "Nr")}${sheetCell(`B${r}`, "Publicație")}${sheetCell(
      `C${r}`,
      "Titlul articolului",
    )}${sheetCell(`D${r}`, "Link")}</row>`,
  );
  r++;

  args.entries.forEach((e, i) => {
    let host = "";
    try {
      host = new URL(e.url).hostname.replace(/^www\./, "");
    } catch {
      host = e.url;
    }
    rows.push(
      `<row r="${r}">${sheetCell(`A${r}`, String(i + 1))}${sheetCell(`B${r}`, host)}${sheetCell(
        `C${r}`,
        e.title || "",
      )}${sheetCell(`D${r}`, e.url)}</row>`,
    );
    r++;
  });

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="5"/><col min="2" max="2" width="26"/><col min="3" max="3" width="70"/><col min="4" max="4" width="80"/></cols><sheetData>${rows.join(
    "",
  )}</sheetData></worksheet>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Raport" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

  return makeZip([
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rels, "utf8") },
    { name: "xl/workbook.xml", data: Buffer.from(workbook, "utf8") },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(workbookRels, "utf8") },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheet, "utf8") },
  ]);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/**
 * Fonturile standard PDF folosesc WinAnsiEncoding, care nu contine s si t cu
 * virgula. Transliteram diacriticele romanesti ca textul sa fie corect afisat
 * in orice cititor, in loc sa apara caractere gresite.
 */
function toWinAnsi(s: string): string {
  const map: Record<string, string> = {
    ă: "a", Ă: "A", â: "a", Â: "A", î: "i", Î: "I",
    ș: "s", Ș: "S", ş: "s", Ş: "S",
    ț: "t", Ț: "T", ţ: "t", Ţ: "T",
    "—": "-", "–": "-", "„": '"', "”": '"', "’": "'", "…": "...",
  };
  return s.replace(/[ăĂâÂîÎșȘşŞțȚţŢ—–„”’…]/g, (c) => map[c] ?? c);
}

function pdfText(s: string): string {
  return toWinAnsi(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Taie textul la latimea paginii, aproximand latimea medie a caracterului. */
function wrap(s: string, maxChars: number): string[] {
  const words = s.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if (!line) line = w;
    else if ((line + " " + w).length <= maxChars) line += " " + w;
    else {
      out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

export function buildReportPdf(args: {
  entries: ReportEntry[];
  clientName?: string | null;
  articleTitle?: string | null;
  date: Date;
  siteName: string;
  siteUrl: string;
  /** Subtitlul de sub titlu. Implicit e raportul de publicare. */
  subtitle?: string;
  /** Eticheta coloanei cu numarul de randuri. */
  countLabel?: string;
  /** Paragrafe puse in rezumat, in locul celui generat automat. */
  intro?: string[];
}): Buffer {
  // ---------------------------------------------------------------------
  // Raportul e ultimul lucru pe care il vede clientul si singura dovada ca
  // si-a primit banii inapoi in servicii. Arata ca un document, nu ca un
  // fisier text: titlu, rezumat, tabel cu numele publicatiei langa link.
  //
  // Diacriticele sunt reale, nu transliterate. Fonturile standard PDF merg
  // pe WinAnsi, care n-are ă, ș si t-virgula — iesea "Arges Expres" si
  // "Braila Expres" in documentul pe care clientul il pune la dosar. De-aia
  // incorporam DejaVu Sans, decupat la caracterele noastre (lib/report-font).
  // ---------------------------------------------------------------------
  const PAGE_W = 595;
  const PAGE_H = 842;
  const M = 42;
  const W = PAGE_W - M * 2;

  const RED: RGB = [0.757, 0.071, 0.122];
  const INK: RGB = [0.07, 0.07, 0.07];
  const MUTED: RGB = [0.42, 0.45, 0.5];
  const LINK: RGB = [0.13, 0.35, 0.72];
  const GRID: RGB = [0.85, 0.86, 0.88];
  const ZEBRA: RGB = [0.973, 0.976, 0.98];
  const WHITE: RGB = [1, 1, 1];

  // Coloanele tabelului: numar, publicatie, link.
  const C_NR = 30;
  const C_PUB = 150;
  const C_LINK = W - C_NR - C_PUB;

  const dupaGazda = new Map<string, string>();
  for (const n of NEWSPAPERS) {
    try {
      dupaGazda.set(new URL(n.url).hostname.replace(/^www\./, ""), n.name);
    } catch {
      /* adresa stricata in date — o sarim, raportul nu trebuie sa cada */
    }
  }
  const numePublicatie = (url: string): string => {
    try {
      return dupaGazda.get(new URL(url).hostname.replace(/^www\./, "")) ?? "";
    } catch {
      return "";
    }
  };

  const pages: Cmd[][] = [];
  let page: Cmd[] = [];
  let y = PAGE_H - M;

  const paginaNoua = () => {
    pages.push(page);
    page = [];
    y = PAGE_H - M - 10;
  };

  // ——— Titlu ———
  const titlu = `Raport de campanie — ${args.clientName || args.siteName}`;
  for (const l of wrapW(titlu, W, 19, true)) {
    page.push({ t: "text", x: M, y, s: l, f: "F2", size: 19, c: INK });
    y -= 24;
  }
  page.push({
    t: "text",
    x: M,
    y,
    s: `${args.subtitle ?? "Raport de publicare"} · ${args.date.toLocaleDateString("ro-RO")}`,
    f: "F1",
    size: 9,
    c: MUTED,
  });
  y -= 30;

  // ——— Rezumat ———
  page.push({ t: "text", x: M, y, s: "Rezumat", f: "F2", size: 13, c: RED });
  y -= 18;

  const rezumat = args.intro?.length
    ? args.intro
    : [
        `Articolul${args.articleTitle ? ` „${args.articleTitle}”` : ""} a fost publicat pe ` +
          `${args.entries.length} publicații online — acoperire națională, câte o publicație în ` +
          `fiecare județ, plus titluri naționale. Fiecare articol are titlu și formulare ` +
          `editoriale proprii, include linkurile către site-ul clientului și datele de contact, ` +
          `și a fost transmis la indexare către motoarele de căutare.`,
      ];
  for (const par of rezumat) {
    if (!par) {
      y -= 8;
      continue;
    }
    for (const l of wrapW(par, W, 9.5, false)) {
      if (y < 90) paginaNoua();
      page.push({ t: "text", x: M, y, s: l, f: "F1", size: 9.5, c: INK });
      y -= 13;
    }
  }
  y -= 18;

  // ——— Tabelul ———
  const H_HEAD = 20;
  const capTabel = () => {
    page.push({ t: "rect", x: M, y: y - H_HEAD + 6, w: W, h: H_HEAD, c: RED });
    page.push({ t: "text", x: M + 10, y, s: "#", f: "F2", size: 9, c: WHITE });
    page.push({ t: "text", x: M + C_NR + 8, y, s: "Publicația", f: "F2", size: 9, c: WHITE });
    page.push({
      t: "text",
      x: M + C_NR + C_PUB + 8,
      y,
      s: args.countLabel ?? "Linkul articolului",
      f: "F2",
      size: 9,
      c: WHITE,
    });
    y -= H_HEAD + 4;
  };
  capTabel();

  args.entries.forEach((e, i) => {
    const nume = e.title || numePublicatie(e.url) || "—";
    const rNume = wrapW(nume, C_PUB - 16, 9, true);
    const rLink = wrapChars(e.url, C_LINK - 16, 8);
    const h = Math.max(rNume.length * 12, rLink.length * 10) + 12;

    if (y - h < 60) {
      paginaNoua();
      capTabel();
    }

    if (i % 2 === 1) page.push({ t: "rect", x: M, y: y - h + 10, w: W, h, c: ZEBRA });
    page.push({ t: "rect", x: M, y: y - h + 10, w: W, h: 0.6, c: GRID });

    page.push({ t: "text", x: M + 10, y, s: String(i + 1), f: "F1", size: 8.5, c: MUTED });
    rNume.forEach((l, j) =>
      page.push({ t: "text", x: M + C_NR + 8, y: y - j * 12, s: l, f: "F2", size: 9, c: INK }),
    );
    rLink.forEach((l, j) =>
      page.push({ t: "text", x: M + C_NR + C_PUB + 8, y: y - j * 10, s: l, f: "F1", size: 8, c: LINK }),
    );
    y -= h;
  });

  pages.push(page);

  pages.forEach((p, i) => {
    p.push({ t: "rect", x: M, y: 46, w: W, h: 0.6, c: GRID });
    p.push({
      t: "text",
      x: M,
      y: 34,
      s: `${args.siteName} · ${args.siteUrl.replace(/^https?:\/\//, "")}`,
      f: "F1",
      size: 7.5,
      c: MUTED,
    });
    p.push({
      t: "text",
      x: PAGE_W - M - 52,
      y: 34,
      s: `Pagina ${i + 1} / ${pages.length}`,
      f: "F1",
      size: 7.5,
      c: MUTED,
    });
  });

  return serializePdf(pages, PAGE_W, PAGE_H);
}

type RGB = [number, number, number];

type Cmd =
  | { t: "rect"; x: number; y: number; w: number; h: number; c: RGB }
  | { t: "text"; x: number; y: number; s: string; f: "F1" | "F2"; size: number; c: RGB };

/** Latimea unui sir, in puncte — din tabelul de latimi al fontului decupat. */
function textWidth(s: string, size: number, bold: boolean): number {
  const w = bold ? FONT_WIDTHS_BOLD : FONT_WIDTHS;
  let total = 0;
  for (const ch of s) {
    const code = FONT_ENCODING[ch] ?? ch.charCodeAt(0);
    const idx = code - FONT_FIRST_CHAR;
    total += (idx >= 0 && idx < w.length ? w[idx] : 600) * size;
  }
  return total / 1000;
}

/** Taie pe cuvinte, la o latime data in puncte. */
function wrapW(s: string, maxW: number, size: number, bold: boolean): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of s.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (textWidth(test, size, bold) <= maxW || !line) line = test;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

/** Taie oriunde — pentru adrese lungi, care n-au spatii. */
function wrapChars(s: string, maxW: number, size: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const ch of s) {
    if (textWidth(line + ch, size, false) > maxW && line) {
      out.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

function col([r, g, b]: RGB): string {
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

/** Codifica textul in codurile fontului nostru si escapeaza ce cere PDF-ul. */
function pdfString(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = FONT_ENCODING[ch] ?? (ch.charCodeAt(0) < 127 ? ch.charCodeAt(0) : 63);
    if (code === 40 || code === 41 || code === 92) out += "\\" + String.fromCharCode(code);
    else if (code < 32 || code > 126) out += "\\" + code.toString(8).padStart(3, "0");
    else out += String.fromCharCode(code);
  }
  return out;
}

/**
 * Scrie obiectele PDF, cu fonturile TrueType incorporate.
 *
 * Ordinea obiectelor: 1 catalog, 2 pages, 3+4 fonturile, 5+6 descriptorii,
 * 7+8 fisierele de font, apoi perechile pagina/continut.
 */
function serializePdf(pages: Cmd[][], PAGE_W: number, PAGE_H: number): Buffer {
  const objects: (string | null)[] = [];
  const binStreams = new Map<number, { data: Buffer; dict: string }>();

  const lastChar = FONT_FIRST_CHAR + FONT_WIDTHS.length - 1;
  const differences = `[ ${FONT_FIRST_CHAR} ${FONT_GLYPHS.map((g) => `/${g}`).join(" ")} ]`;

  const fontDict = (id: number, descriptorId: number, widths: number[], name: string) =>
    `<< /Type /Font /Subtype /TrueType /BaseFont /${name} /FirstChar ${FONT_FIRST_CHAR} ` +
    `/LastChar ${lastChar} /Widths [${widths.join(" ")}] ` +
    `/Encoding << /Type /Encoding /Differences ${differences} >> ` +
    `/FontDescriptor ${descriptorId} 0 R >>`;

  const descriptor = (name: string, m: (typeof FONT_METRICS)["regular"], fileId: number) =>
    `<< /Type /FontDescriptor /FontName /${name} /Flags 32 /FontBBox [${m.bbox.join(" ")}] ` +
    `/ItalicAngle ${m.italicAngle} /Ascent ${m.ascent} /Descent ${m.descent} ` +
    `/CapHeight ${m.capHeight} /StemV ${m.stemV} /FontFile2 ${fileId} 0 R >>`;

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = fontDict(3, 5, FONT_WIDTHS, "DejaVuSans");
  objects[4] = fontDict(4, 6, FONT_WIDTHS_BOLD, "DejaVuSans-Bold");
  objects[5] = descriptor("DejaVuSans", FONT_METRICS.regular, 7);
  objects[6] = descriptor("DejaVuSans-Bold", FONT_METRICS.bold, 8);

  for (const [id, b64] of [
    [7, FONT_REGULAR_B64],
    [8, FONT_BOLD_B64],
  ] as [number, string][]) {
    const raw = Buffer.from(b64, "base64");
    const zipped = deflateSync(raw);
    binStreams.set(id, {
      data: zipped,
      dict: `<< /Length ${zipped.length} /Length1 ${raw.length} /Filter /FlateDecode >>`,
    });
    objects[id] = null;
  }

  let nextId = 9;
  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];
  for (let i = 0; i < pages.length; i++) {
    pageObjIds.push(nextId++);
    contentObjIds.push(nextId++);
  }
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjIds
    .map((id) => `${id} 0 R`)
    .join(" ")}] >>`;

  pages.forEach((cmds, pi) => {
    let c = "";
    for (const cmd of cmds) {
      if (cmd.t === "rect") {
        c +=
          `q ${col(cmd.c)} rg ${cmd.x.toFixed(2)} ${cmd.y.toFixed(2)} ` +
          `${cmd.w.toFixed(2)} ${cmd.h.toFixed(2)} re f Q\n`;
      } else if (cmd.s) {
        c +=
          `BT ${col(cmd.c)} rg /${cmd.f} ${cmd.size} Tf ` +
          `1 0 0 1 ${cmd.x.toFixed(2)} ${cmd.y.toFixed(2)} Tm (${pdfString(cmd.s)}) Tj ET\n`;
      }
    }
    const buf = Buffer.from(c, "latin1");
    binStreams.set(contentObjIds[pi], {
      data: buf,
      dict: `<< /Length ${buf.length} >>`,
    });
    objects[contentObjIds[pi]] = null;
    objects[pageObjIds[pi]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjIds[pi]} 0 R >>`;
  });

  const parts: Buffer[] = [];
  let pos = 0;
  const push = (b: Buffer) => {
    parts.push(b);
    pos += b.length;
  };
  const offsets: number[] = [];

  push(Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1"));

  const total = nextId - 1;
  for (let id = 1; id <= total; id++) {
    offsets[id] = pos;
    const bin = binStreams.get(id);
    if (bin) {
      push(Buffer.from(`${id} 0 obj\n${bin.dict}\nstream\n`, "latin1"));
      push(bin.data);
      push(Buffer.from("\nendstream\nendobj\n", "latin1"));
    } else {
      push(Buffer.from(`${id} 0 obj\n${objects[id]}\nendobj\n`, "latin1"));
    }
  }

  const xrefPos = pos;
  let xref = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= total; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  push(Buffer.from(xref, "latin1"));

  return Buffer.concat(parts);
}
