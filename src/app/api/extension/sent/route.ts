import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { verifyExtensionKey, corsPreflight, CORS_HEADERS } from "@/lib/extension-auth";

export const runtime = "nodejs";

// Salveaza mesajul LinkedIn pe prospect (draft sau trimis).
// - sent=false: salveaza mesajul ca draft (status ramane neschimbat)
// - sent=true:  marcheaza prospectul ca 'contacted' + incrementeaza emailsSent
// Daca prospectul nu exista inca (mesaj generat fara sa fi apasat "Salveaza"),
// il cream automat din datele profilului.

const schema = z.object({
  profile: z.object({
    name: z.string().min(2).max(160),
    title: z.string().max(200).optional(),
    company: z.string().max(200).optional(),
    location: z.string().max(160).optional(),
    linkedinUrl: z.string().url().max(400),
  }),
  message: z.string().min(1).max(2000),
  sent: z.boolean(),
});

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

  const { profile, message, sent } = parsed.data;
  const linkedinUrl = normalizeLinkedinUrl(profile.linkedinUrl);
  const now = new Date();
  const noteLine = `[${now.toLocaleString("ro-RO")}] Mesaj LinkedIn ${sent ? "TRIMIS" : "generat"}:\n${message}`;

  const [existing] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.linkedinUrl, linkedinUrl))
    .limit(1);

  if (existing) {
    await db
      .update(prospects)
      .set({
        lastEmailSubject: "Mesaj LinkedIn",
        lastEmailBody: message,
        notes: existing.notes ? `${existing.notes}\n\n${noteLine}` : noteLine,
        ...(sent
          ? {
              status: existing.status === "new" ? "contacted" : existing.status,
              emailsSent: (existing.emailsSent || 0) + 1,
              lastEmailAt: now,
            }
          : {}),
        updatedAt: now,
      })
      .where(eq(prospects.id, existing.id));
    return NextResponse.json(
      { ok: true, prospectId: existing.id, created: false },
      { headers: CORS_HEADERS },
    );
  }

  // Prospectul nu exista — il cream din datele profilului
  const [created] = await db
    .insert(prospects)
    .values({
      companyName: profile.company || "(necunoscut)",
      contactName: profile.name,
      contactTitle: profile.title || null,
      city: profile.location || null,
      linkedinUrl,
      industry: "Agenție PR / Marketing",
      source: "linkedin",
      status: sent ? "contacted" : "new",
      emailsSent: sent ? 1 : 0,
      lastEmailAt: sent ? now : null,
      lastEmailSubject: "Mesaj LinkedIn",
      lastEmailBody: message,
      notes: noteLine,
    })
    .returning({ id: prospects.id });

  return NextResponse.json(
    { ok: true, prospectId: created.id, created: true },
    { headers: CORS_HEADERS },
  );
}
