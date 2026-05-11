import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { isSuppressed } from "@/data/suppression-list";

export const runtime = "nodejs";

const schema = z.object({
  csv: z.string().min(1, "CSV gol").max(500_000, "CSV prea mare (max 500k caractere)"),
  industryDefault: z.string().max(100).optional(),
});

// Parser minimal CSV care suportă:
//  - field-uri cu virgule în ghilimele duble: "Comp, SA",email@..
//  - escape de ghilimele duble în interior: ""text""
//  - separatori \n sau \r\n
//  - linii goale ignorate
//  - whitespace trim per field
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < csv.length) {
    const c = csv[i];

    if (inQuotes) {
      if (c === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field.trim());
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field.trim());
      if (row.some((f) => f.length > 0)) rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // flush last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((f) => f.length > 0)) rows.push(row);
  }
  return rows;
}

const KNOWN_COLUMNS = [
  "companyname",
  "company",
  "firma",
  "nume",
  "email",
  "mail",
  "contactname",
  "contact",
  "persoana",
  "industry",
  "industrie",
  "domeniu",
  "city",
  "oras",
  "website",
  "site",
  "web",
  "phone",
  "telefon",
  "notes",
  "note",
  "observatii",
];

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[^a-z]/g, "");
}

function mapHeader(h: string): keyof RowShape | null {
  const n = normalizeHeader(h);
  if (["companyname", "company", "firma", "nume"].includes(n)) return "companyName";
  if (["email", "mail"].includes(n)) return "email";
  if (["contactname", "contact", "persoana"].includes(n)) return "contactName";
  if (["industry", "industrie", "domeniu"].includes(n)) return "industry";
  if (["city", "oras"].includes(n)) return "city";
  if (["website", "site", "web"].includes(n)) return "website";
  if (["phone", "telefon"].includes(n)) return "phone";
  if (["notes", "note", "observatii"].includes(n)) return "notes";
  return null;
}

interface RowShape {
  companyName?: string;
  email?: string;
  contactName?: string;
  industry?: string;
  city?: string;
  website?: string;
  phone?: string;
  notes?: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
        { status: 400 }
      );
    }

    const rows = parseCsv(parsed.data.csv);
    if (rows.length < 2) {
      return NextResponse.json(
        { ok: false, error: "CSV trebuie să conțină cap rând + cel puțin un rând de date." },
        { status: 400 }
      );
    }

    const headerRow = rows[0];
    const colMap: (keyof RowShape | null)[] = headerRow.map(mapHeader);

    if (!colMap.includes("companyName") || !colMap.includes("email")) {
      return NextResponse.json(
        {
          ok: false,
          error: `CSV trebuie să conțină coloanele 'companyName' și 'email'. Coloane recunoscute: ${KNOWN_COLUMNS.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const dataRows = rows.slice(1);
    const candidates: RowShape[] = [];
    const skippedReasons: Array<{ rowIndex: number; reason: string }> = [];

    dataRows.forEach((r, idx) => {
      const obj: RowShape = {};
      colMap.forEach((key, i) => {
        if (!key) return;
        const value = (r[i] || "").trim();
        if (value) obj[key] = value;
      });

      if (!obj.companyName) {
        skippedReasons.push({ rowIndex: idx + 2, reason: "lipsa companyName" });
        return;
      }
      if (!obj.email) {
        skippedReasons.push({ rowIndex: idx + 2, reason: "lipsa email" });
        return;
      }
      if (!EMAIL_RE.test(obj.email)) {
        skippedReasons.push({ rowIndex: idx + 2, reason: `email invalid: ${obj.email}` });
        return;
      }
      if (isSuppressed(obj.email)) {
        skippedReasons.push({ rowIndex: idx + 2, reason: `${obj.email} în suppression list` });
        return;
      }
      candidates.push(obj);
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        imported: 0,
        skipped: skippedReasons.length,
        duplicate: 0,
        total: dataRows.length,
        skippedReasons: skippedReasons.slice(0, 20),
        message: "Niciun rând valid în CSV.",
      });
    }

    // Dedupe când email-ul deja există în prospects.
    const candidateEmails = candidates.map((c) => c.email!);
    const existing = await db
      .select({ email: prospects.email })
      .from(prospects)
      .where(inArray(prospects.email, candidateEmails));
    const existingSet = new Set(existing.map((e) => e.email));

    // Dedupe și în interiorul CSV-ului (același email pe două rânduri = 1 import).
    const seenInBatch = new Set<string>();
    const toInsert = candidates
      .filter((c) => {
        if (existingSet.has(c.email!)) return false;
        if (seenInBatch.has(c.email!)) return false;
        seenInBatch.add(c.email!);
        return true;
      })
      .map((c) => ({
        id: crypto.randomUUID(),
        companyName: c.companyName!,
        contactName: c.contactName ?? null,
        email: c.email!,
        phone: c.phone ?? null,
        city: c.city ?? null,
        website: c.website ?? null,
        industry: c.industry ?? parsed.data.industryDefault ?? null,
        notes: c.notes ?? null,
        status: "new" as const,
      }));

    if (toInsert.length > 0) {
      await db.insert(prospects).values(toInsert);
    }

    return NextResponse.json({
      ok: true,
      imported: toInsert.length,
      duplicate: candidates.length - toInsert.length,
      skipped: skippedReasons.length,
      total: dataRows.length,
      skippedReasons: skippedReasons.slice(0, 20),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Eroare server necunoscuta";
    console.error("[import-csv] Top-level error:", e);
    return NextResponse.json(
      { ok: false, error: `Server crash: ${message}` },
      { status: 500 }
    );
  }
}
