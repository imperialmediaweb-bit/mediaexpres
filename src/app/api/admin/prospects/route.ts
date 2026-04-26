import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects } from "@/db/schema";

export const runtime = "nodejs";

const createSchema = z.object({
  companyName: z.string().min(2).max(150),
  contactName: z.string().max(150).optional().or(z.literal("")),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.errors[0]?.message || "Date invalide" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await db.insert(prospects).values({
    id,
    companyName: parsed.data.companyName,
    contactName: parsed.data.contactName || null,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    industry: parsed.data.industry || null,
    city: parsed.data.city || null,
    website: parsed.data.website || null,
    notes: parsed.data.notes || null,
    status: "new",
  });

  return NextResponse.json({ ok: true, id });
}
