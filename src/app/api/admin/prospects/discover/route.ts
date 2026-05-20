import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { discoverAgencies, type DiscoveredAgency } from "@/lib/discover-agencies";
import { isSuppressed } from "@/data/suppression-list";
import { extractEmailFromSite } from "@/lib/extract-email";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  query: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  count: z.number().int().min(1).max(40).optional(),
});

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  }

  // Pasul 1 — AI generează lista de firme reale (nume + website)
  let candidates: DiscoveredAgency[] = [];
  try {
    candidates = await discoverAgencies(parsed.data);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Eroare la descoperire" },
      { status: 500 },
    );
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      ok: true,
      discovered: 0,
      imported: 0,
      importedList: [],
      skipped: [],
    });
  }

  // Dedup pe website (existente în DB)
  const websites = candidates.map((c) => c.website);
  const existing = await db
    .select({ website: prospects.website, email: prospects.email })
    .from(prospects)
    .where(inArray(prospects.website, websites));
  const existingWebsites = new Set(
    existing.map((e) => (e.website || "").replace(/^https?:\/\//, "").replace(/^www\./, "")),
  );
  const existingEmails = new Set(existing.map((e) => (e.email || "").toLowerCase()));

  const importedList: { companyName: string; email: string; website: string }[] = [];
  const skipped: string[] = [];

  // Pasul 2 — pentru fiecare firmă, extrage emailul REAL din site-ul ei
  for (const agency of candidates) {
    const cleanDomain = agency.website.replace(/^www\./, "");
    if (existingWebsites.has(cleanDomain)) {
      skipped.push(`${agency.companyName} — deja în prospecți`);
      continue;
    }

    const email = await extractEmailFromSite(agency.website);
    if (!email) {
      skipped.push(`${agency.companyName} — fără email public pe site (sau site inexistent)`);
      continue;
    }
    if (isSuppressed(email)) {
      skipped.push(`${agency.companyName} — partener existent (suppression list)`);
      continue;
    }
    if (existingEmails.has(email)) {
      skipped.push(`${agency.companyName} — email deja în prospecți`);
      continue;
    }

    try {
      await db.insert(prospects).values({
        companyName: agency.companyName,
        email,
        website: `https://${agency.website}`,
        city: agency.city || null,
        industry: agency.industry || "Agenție PR / Marketing",
        status: "new",
        source: "discover",
        notes: `Descoperit automat cu AI pe ${new Date().toLocaleDateString("ro-RO")}. Email extras de pe site-ul oficial.`,
      });
      existingEmails.add(email);
      importedList.push({ companyName: agency.companyName, email, website: agency.website });
    } catch (e) {
      skipped.push(`${agency.companyName} — eroare la salvare: ${String(e)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    discovered: candidates.length,
    imported: importedList.length,
    importedList,
    skipped,
  });
}
