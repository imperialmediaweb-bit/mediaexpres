import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  raw: z.string().min(3).max(50_000),
});

interface ParsedLead {
  name: string;
  email: string;
  phone: string;
}

const EMAIL_RX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const PHONE_RX = /(?:\+?40|0)\s*7\d[\s.\-]*\d{3}[\s.\-]*\d{3}/;

function parseLeads(raw: string): ParsedLead[] {
  const leads: ParsedLead[] = [];
  const seen = new Set<string>();

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    const emailMatch = line.match(EMAIL_RX);
    if (!emailMatch) continue;
    const email = emailMatch[0].toLowerCase();
    if (seen.has(email)) continue;

    const phoneMatch = line.match(PHONE_RX);
    const phone = phoneMatch ? phoneMatch[0].replace(/\s|\.|-/g, "") : "";

    // Numele = ce rămâne după ce scoatem email + telefon, curățat de separatori
    let name = line
      .replace(EMAIL_RX, "")
      .replace(PHONE_RX, "")
      .replace(/[,;|\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Dacă conține caractere ciudate (uri, header etc), încercăm splituire pe separatori
    if (!name || name.length < 2) {
      const parts = line.split(/[,;|\t]/).map((p) => p.trim()).filter(Boolean);
      const namePart = parts.find(
        (p) => !p.match(EMAIL_RX) && !p.match(PHONE_RX) && p.length >= 2
      );
      name = namePart || email.split("@")[0];
    }

    seen.add(email);
    leads.push({ name, email, phone });
  }

  return leads;
}

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  }

  const leads = parseLeads(parsed.data.raw);

  if (leads.length === 0) {
    return NextResponse.json({
      ok: true,
      parsed: 0,
      imported: 0,
      duplicates: 0,
      importedList: [],
      errors: ["Niciun lead detectat — verifică formatul (trebuie cel puțin un email pe linie)."],
    });
  }

  const imported: string[] = [];
  const duplicateList: string[] = [];
  const errors: string[] = [];

  for (const lead of leads) {
    try {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, lead.email))
        .limit(1);
      if (existing.length > 0) {
        duplicateList.push(`${lead.name} (${lead.email})`);
        continue;
      }
      await db.insert(users).values({
        email: lead.email,
        name: lead.name,
        phone: lead.phone || null,
      });
      imported.push(`${lead.name} (${lead.email}${lead.phone ? `, ${lead.phone}` : ""})`);
    } catch (err) {
      errors.push(`${lead.email}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    parsed: leads.length,
    imported: imported.length,
    duplicates: duplicateList.length,
    importedList: imported,
    duplicateList,
    errors,
  });
}
