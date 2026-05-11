import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { PR_AGENCIES_ROMANIA } from "@/data/pr-agencies-romania";

export const runtime = "nodejs";

export async function POST() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  const allEmails = PR_AGENCIES_ROMANIA.map((a) => a.email);
  const existing = await db
    .select({ email: prospects.email })
    .from(prospects)
    .where(inArray(prospects.email, allEmails));
  const existingSet = new Set(existing.map((e) => e.email));

  const toInsert = PR_AGENCIES_ROMANIA
    .filter((a) => !existingSet.has(a.email))
    .map((a) => ({
      id: crypto.randomUUID(),
      companyName: a.companyName,
      contactName: a.contactName ?? null,
      email: a.email,
      city: a.city ?? null,
      website: a.website ?? null,
      industry: "Agentie PR",
      notes: a.notes ?? null,
      status: "new" as const,
    }));

  if (toInsert.length > 0) {
    await db.insert(prospects).values(toInsert);
  }

  return NextResponse.json({
    ok: true,
    imported: toInsert.length,
    skipped: PR_AGENCIES_ROMANIA.length - toInsert.length,
    total: PR_AGENCIES_ROMANIA.length,
  });
}
