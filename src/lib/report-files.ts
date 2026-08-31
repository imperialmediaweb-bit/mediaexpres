import { deflateRawSync } from "node:zlib";
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
  /** Subtitlul de sub sigla. Implicit e raportul de publicare. */
  subtitle?: string;
  /** Eticheta de dinaintea numarului de randuri (implicit "Publicatii"). */
  countLabel?: string;
  /** Randuri libere puse dupa antet, inainte de lista. */
  intro?: string[];
}): Buffer {
  // ---------------------------------------------------------------------
  // Raportul e ULTIMUL lucru pe care il vede clientul si singura dovada ca
  // si-a primit banii inapoi in servicii. A fost multa vreme o insiruire de
  // URL-uri intr-un font de masina de scris — arata a fisier text, nu a
  // livrabil platit. Acum are antet, casetele cu datele comenzii, numele
  // fiecarei publicatii langa adresa ei si numerotare pe pagini.
  // ---------------------------------------------------------------------
  const PAGE_W = 595; // A4 in puncte
  const PAGE_H = 842;
  const M = 46; // marginea laterala
  const W = PAGE_W - M * 2;

  const NAVY: RGB = [0.067, 0.067, 0.067];
  const RED: RGB = [0.757, 0.071, 0.122];
  const GOLD: RGB = [0.788, 0.631, 0.291];
  const TEXT: RGB = [0.13, 0.16, 0.22];
  const MUTED: RGB = [0.45, 0.5, 0.58];
  const LINE: RGB = [0.9, 0.91, 0.93];
  const ZEBRA: RGB = [0.976, 0.98, 0.985];
  const WHITE: RGB = [1, 1, 1];

  // Numele publicatiei, dedus din adresa. `new URL` converteste singur
  // domeniile cu diacritice in forma punycode din datele noastre, deci
  // "constanțaexpres.ro" si "xn--constanaexpres-mbf.ro" se potrivesc.
  const dupaGazda = new Map<string, string>();
  for (const n of NEWSPAPERS) {
    try {
      dupaGazda.set(new URL(n.url).hostname.replace(/^www\./, ""), n.name);
    } catch {
      /* adresa stricata in date — o sarim, raportul nu trebuie sa cada */
    }
  }
  function numePublicatie(url: string): string | null {
    try {
      return dupaGazda.get(new URL(url).hostname.replace(/^www\./, "")) ?? null;
    } catch {
      return null;
    }
  }

  const pages: Cmd[][] = [];
  let page: Cmd[] = [];
  let y = 0;

  const antetPagina = (prima: boolean) => {
    page = [];
    page.push({ t: "rect", x: 0, y: PAGE_H - (prima ? 104 : 58), w: PAGE_W, h: prima ? 104 : 58, c: NAVY });
    if (prima) {
      page.push({ t: "text", x: M, y: PAGE_H - 52, s: args.siteName.toUpperCase(), f: "F2", size: 22, c: WHITE });
      page.push({ t: "text", x: M, y: PAGE_H - 70, s: "PRESA · DISTRIBUTIE · IMPACT", f: "F1", size: 7.5, c: GOLD });
      page.push({
        t: "text",
        x: M,
        y: PAGE_H - 92,
        s: args.subtitle ?? "Raport de publicare",
        f: "F2",
        size: 11,
        c: WHITE,
      });
      y = PAGE_H - 104 - 30;
    } else {
      page.push({ t: "text", x: M, y: PAGE_H - 36, s: args.siteName.toUpperCase(), f: "F2", size: 12, c: WHITE });
      page.push({
        t: "text",
        x: M,
        y: PAGE_H - 50,
        s: args.subtitle ?? "Raport de publicare",
        f: "F1",
        size: 8,
        c: GOLD,
      });
      y = PAGE_H - 58 - 26;
    }
  };

  const paginaNoua = () => {
    pages.push(page);
    antetPagina(false);
  };

  const loc = (h: number) => {
    if (y - h < 56) paginaNoua();
  };

  antetPagina(true);

  // ——— Caseta cu datele comenzii ———
  const detalii: [string, string][] = [];
  if (args.clientName) detalii.push(["Client", args.clientName]);
  if (args.articleTitle) detalii.push(["Articol", args.articleTitle]);
  detalii.push(["Data", args.date.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })]);
  detalii.push([args.countLabel ?? "Publicatii", String(args.entries.length)]);

  const hCaseta = 16 + detalii.reduce((acc, [, v]) => acc + wrap(v, 62).length * 13, 0) + 10;
  page.push({ t: "rect", x: M, y: y - hCaseta, w: W, h: hCaseta, c: ZEBRA });
  page.push({ t: "rect", x: M, y: y - hCaseta, w: 3, h: hCaseta, c: RED });
  let yd = y - 16;
  for (const [k, v] of detalii) {
    const randuri = wrap(v, 62);
    page.push({ t: "text", x: M + 16, y: yd, s: k.toUpperCase(), f: "F1", size: 7.5, c: MUTED });
    randuri.forEach((r, i) => {
      page.push({ t: "text", x: M + 96, y: yd - i * 13, s: r, f: i === 0 ? "F2" : "F1", size: 9.5, c: TEXT });
    });
    yd -= randuri.length * 13;
  }
  y -= hCaseta + 22;

  // ——— Randurile de intro (folosite de lista retelei) ———
  for (const l of args.intro ?? []) {
    if (!l) {
      y -= 7;
      continue;
    }
    for (const w of wrap(l, 88)) {
      loc(13);
      page.push({ t: "text", x: M, y, s: w, f: "F1", size: 9, c: TEXT });
      y -= 13;
    }
  }
  if ((args.intro?.length ?? 0) > 0) y -= 10;

  // ——— Titlul listei ———
  loc(30);
  page.push({ t: "text", x: M, y, s: (args.countLabel ?? "PUBLICATII").toUpperCase(), f: "F2", size: 9, c: RED });
  y -= 6;
  page.push({ t: "rect", x: M, y, w: W, h: 0.8, c: LINE });
  y -= 18;

  // ——— Lista ———
  args.entries.forEach((e, i) => {
    const nume = e.title || numePublicatie(e.url) || "";
    const adresa = e.url.replace(/^https?:\/\//, "");
    const rAdresa = wrap(adresa, 92);
    const h = (nume ? 13 : 0) + rAdresa.length * 11 + 9;

    loc(h);
    if (i % 2 === 1) {
      page.push({ t: "rect", x: M - 6, y: y - h + 8, w: W + 12, h, c: ZEBRA });
    }
    page.push({ t: "text", x: M, y, s: String(i + 1).padStart(2, "0"), f: "F2", size: 9, c: GOLD });
    if (nume) {
      page.push({ t: "text", x: M + 26, y, s: nume, f: "F2", size: 9.5, c: TEXT });
      y -= 12;
    }
    rAdresa.forEach((r, j) => {
      page.push({ t: "text", x: M + 26, y: y - j * 11, s: r, f: "F1", size: 8, c: nume ? MUTED : TEXT });
    });
    y -= rAdresa.length * 11 + 9;
  });

  pages.push(page);

  // ——— Subsolul, pe fiecare pagina ———
  pages.forEach((p, i) => {
    p.push({ t: "rect", x: M, y: 44, w: W, h: 0.8, c: LINE });
    p.push({ t: "text", x: M, y: 32, s: `${args.siteName} · ${args.siteUrl.replace(/^https?:\/\//, "")}`, f: "F1", size: 7.5, c: MUTED });
    p.push({ t: "text", x: PAGE_W - M - 46, y: 32, s: `Pagina ${i + 1} / ${pages.length}`, f: "F1", size: 7.5, c: MUTED });
  });

  return serializePdf(pages, PAGE_W, PAGE_H);
}

type RGB = [number, number, number];

/** O singura instructiune de desen. Ordinea din lista e ordinea pe hartie. */
type Cmd =
  | { t: "rect"; x: number; y: number; w: number; h: number; c: RGB }
  | { t: "text"; x: number; y: number; s: string; f: "F1" | "F2"; size: number; c: RGB };

function col([r, g, b]: RGB): string {
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

/** Scrie obiectele PDF si tabelul xref. Separat, ca desenul sa ramana citibil. */
function serializePdf(pages: Cmd[][], PAGE_W: number, PAGE_H: number): Buffer {
  const objects: string[] = [];
  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];

  let nextId = 5;
  for (let i = 0; i < pages.length; i++) {
    pageObjIds.push(nextId++);
    contentObjIds.push(nextId++);
  }

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  const streams: Buffer[] = [];
  pages.forEach((cmds, pi) => {
    let c = "";
    for (const cmd of cmds) {
      if (cmd.t === "rect") {
        c += `q ${col(cmd.c)} rg ${cmd.x.toFixed(2)} ${cmd.y.toFixed(2)} ${cmd.w.toFixed(2)} ${cmd.h.toFixed(2)} re f Q\n`;
      } else if (cmd.s) {
        c += `BT ${col(cmd.c)} rg /${cmd.f} ${cmd.size} Tf 1 0 0 1 ${cmd.x.toFixed(2)} ${cmd.y.toFixed(2)} Tm (${pdfText(cmd.s)}) Tj ET\n`;
      }
    }
    const buf = Buffer.from(c, "latin1");
    streams[pi] = buf;
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
    const ci = contentObjIds.indexOf(id);
    if (ci >= 0) {
      const stream = streams[ci];
      push(Buffer.from(`${id} 0 obj\n<< /Length ${stream.length} >>\nstream\n`, "latin1"));
      push(stream);
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
