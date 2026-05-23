import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { generateLinkedInMessage } from "@/lib/linkedin-message";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  prospectId: z.string().min(1),
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

  const rows = await db
    .select({
      id: prospects.id,
      contactName: prospects.contactName,
      contactTitle: prospects.contactTitle,
      companyName: prospects.companyName,
    })
    .from(prospects)
    .where(eq(prospects.id, parsed.data.prospectId))
    .limit(1);
  const p = rows[0];
  if (!p) {
    return NextResponse.json({ ok: false, error: "Prospect inexistent" }, { status: 404 });
  }
  if (!p.contactName) {
    return NextResponse.json(
      { ok: false, error: "Prospectul nu are nume — nu pot genera mesaj" },
      { status: 400 },
    );
  }

  try {
    const message = await generateLinkedInMessage({
      name: p.contactName,
      title: p.contactTitle || undefined,
      company: p.companyName && p.companyName !== "(necunoscut)" ? p.companyName : undefined,
    });
    await db
      .update(prospects)
      .set({ lastEmailBody: message, updatedAt: new Date() })
      .where(eq(prospects.id, p.id));
    return NextResponse.json({ ok: true, message });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Eroare la generare" },
      { status: 500 },
    );
  }
}
