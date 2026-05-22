import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { isSuppressed } from "@/data/suppression-list";
import { extractEmailFromSite } from "@/lib/extract-email";
import { verifyExtensionKey, corsPreflight, CORS_HEADERS } from "@/lib/extension-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// DOM-ul LinkedIn e dezordonat — taiem stringurile lungi in loc sa respingem
// tot batch-ul. Un profil cu text aiurea nu trebuie sa pice celelalte 49.
const capped = (max: number) =>
  z.string().transform((s) => s.replace(/\s+/g, " ").trim().slice(0, max));

const profileSchema = z.object({
  name: capped(160),
  title: capped(200).optional(),
  company: capped(200).optional(),
  location: capped(160).optional(),
  linkedinUrl: z.string().url().max(400),
  companyWebsite: capped(300).optional(),
});

const schema = z.object({
  profiles: z.array(profileSchema).min(1).max(50),
});

// Normalizeaza un URL de profil LinkedIn pentru dedup consistent.
function normalizeLinkedinUrl(url: string): string {
  return url
    .split("?")[0]
    .replace(/\/$/, "")
    .replace(/^http:/, "https:")
    .toLowerCase();
}

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  const authError = verifyExtensionKey(req);
  if (authError) return authError;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "JSON invalid" },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const profiles = parsed.data.profiles.map((p) => ({
      ...p,
      linkedinUrl: normalizeLinkedinUrl(p.linkedinUrl),
    }));

    // Dedup pe linkedinUrl existent in DB
    const urls = profiles.map((p) => p.linkedinUrl);
    const existing = await db
      .select({ linkedinUrl: prospects.linkedinUrl })
      .from(prospects)
      .where(inArray(prospects.linkedinUrl, urls));
    const existingUrls = new Set(
      existing.map((e) => (e.linkedinUrl || "").toLowerCase()),
    );

    const imported: string[] = [];
    const duplicates: string[] = [];
    const errors: string[] = [];
    const seenInBatch = new Set<string>();

    for (const p of profiles) {
      if (p.name.length < 2) {
        errors.push("Profil fără nume valid — omis.");
        continue;
      }
      if (existingUrls.has(p.linkedinUrl) || seenInBatch.has(p.linkedinUrl)) {
        duplicates.push(p.name);
        continue;
      }
      seenInBatch.add(p.linkedinUrl);

      // Enrichment optional: daca avem website de firma, incercam emailul public
      let email: string | null = null;
      if (p.companyWebsite) {
        try {
          email = await extractEmailFromSite(p.companyWebsite);
        } catch {
          email = null;
        }
      }
      if (email && isSuppressed(email)) {
        // Partener existent — il salvam fara email ca sa nu primeasca outreach
        email = null;
      }

      try {
        await db.insert(prospects).values({
          companyName: p.company || "(necunoscut)",
          contactName: p.name,
          contactTitle: p.title || null,
          email,
          city: p.location || null,
          website: p.companyWebsite ? `https://${p.companyWebsite.replace(/^https?:\/\//, "")}` : null,
          linkedinUrl: p.linkedinUrl,
          industry: "Agenție PR / Marketing",
          status: "new",
          source: "linkedin",
          notes: `Capturat din LinkedIn pe ${new Date().toLocaleDateString("ro-RO")}.${email ? " Email extras de pe site-ul firmei." : " Fara email — contact pe LinkedIn."}`,
        });
        imported.push(`${p.name}${email ? ` (${email})` : ""}`);
      } catch (e) {
        console.error("[extension/prospects] insert failed:", e);
        errors.push(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        imported: imported.length,
        duplicates: duplicates.length,
        importedList: imported,
        duplicateList: duplicates,
        errors,
      },
      { headers: CORS_HEADERS },
    );
  } catch (e) {
    console.error("[extension/prospects] 500:", e);
    return NextResponse.json(
      { ok: false, error: `Eroare server: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
