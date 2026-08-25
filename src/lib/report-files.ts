import { deflateRawSync } from "node:zlib";

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
}): Buffer {
  const PAGE_H = 842; // A4 in puncte
  const PAGE_W = 595;
  const MARGIN = 50;
  const LINE = 14;

  // Construim liniile: [text, font, marime]
  type Line = [string, "F1" | "F2", number];
  const lines: Line[] = [];
  lines.push([args.siteName.toUpperCase(), "F2", 18]);
  lines.push(["Raport de publicare", "F1", 11]);
  lines.push(["", "F1", 11]);
  if (args.clientName) lines.push([`Client: ${args.clientName}`, "F1", 11]);
  if (args.articleTitle) {
    for (const l of wrap(`Campanie: ${args.articleTitle}`, 80)) lines.push([l, "F1", 11]);
  }
  lines.push([`Data: ${args.date.toLocaleDateString("ro-RO")}`, "F1", 11]);
  lines.push([`Publicatii: ${args.entries.length}`, "F1", 11]);
  lines.push(["", "F1", 11]);

  args.entries.forEach((e, i) => {
    const title = e.title || "";
    if (title) {
      for (const l of wrap(`${i + 1}. ${title}`, 78)) lines.push([l, "F2", 10]);
      for (const l of wrap(e.url, 92)) lines.push([l, "F1", 9]);
    } else {
      for (const l of wrap(`${i + 1}. ${e.url}`, 92)) lines.push([l, "F1", 10]);
    }
    lines.push(["", "F1", 6]);
  });

  lines.push(["", "F1", 11]);
  lines.push([`Generat de ${args.siteName} - ${args.siteUrl}`, "F1", 9]);

  // Impartim pe pagini
  const usable = PAGE_H - MARGIN * 2;
  const perPage = Math.floor(usable / LINE);
  const pages: Line[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  if (pages.length === 0) pages.push([]);

  // Obiectele PDF
  const objects: string[] = [];
  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];

  // 1 = Catalog, 2 = Pages, 3 = F1, 4 = F2, apoi perechi pagina/continut
  let nextId = 5;
  for (let i = 0; i < pages.length; i++) {
    pageObjIds.push(nextId++);
    contentObjIds.push(nextId++);
  }

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjIds
    .map((id) => `${id} 0 R`)
    .join(" ")}] >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  const streams: Buffer[] = [];
  pages.forEach((page, pi) => {
    let y = PAGE_H - MARGIN;
    let content = "BT\n";
    for (const [text, font, size] of page) {
      if (text) {
        content += `/${font} ${size} Tf\n1 0 0 1 ${MARGIN} ${y} Tm\n(${pdfText(text)}) Tj\n`;
      }
      y -= LINE;
    }
    content += "ET\n";
    const buf = Buffer.from(content, "latin1");
    streams[pi] = buf;

    objects[pageObjIds[pi]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjIds[pi]} 0 R >>`;
  });

  // Serializare cu tabel xref
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
