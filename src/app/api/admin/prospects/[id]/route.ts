import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["new", "contacted", "replied", "interested", "converted", "declined", "bounced"]).optional(),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });

  const patch: Partial<typeof prospects.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes || null;

  await db.update(prospects).set(patch).where(eq(prospects.id, params.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  await db.delete(prospects).where(eq(prospects.id, params.id));
  return NextResponse.json({ ok: true });
}
