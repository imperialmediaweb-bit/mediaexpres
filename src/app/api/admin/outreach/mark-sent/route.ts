import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects } from "@/db/schema";

export const runtime = "nodejs";

const schema = z.object({
  prospectId: z.string().min(1),
  message: z.string().max(2000).optional(),
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

  const now = new Date();
  await db
    .update(prospects)
    .set({
      status: "contacted",
      lastEmailAt: now,
      lastEmailSubject: "LinkedIn — invitație de conectare",
      lastEmailBody: parsed.data.message ?? undefined,
      updatedAt: now,
    })
    .where(eq(prospects.id, parsed.data.prospectId));

  return NextResponse.json({ ok: true });
}
