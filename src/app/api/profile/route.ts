import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const profileSchema = z.object({
  name: z.string().max(150).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  companyName: z.string().max(200).optional().or(z.literal("")),
  companyCui: z.string().max(40).optional().or(z.literal("")),
  companyRegNo: z.string().max(80).optional().or(z.literal("")),
  companyAddress: z.string().max(400).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 }
    );
  }

  const d = parsed.data;
  await db
    .update(users)
    .set({
      name: d.name || null,
      phone: d.phone || null,
      companyName: d.companyName || null,
      companyCui: d.companyCui || null,
      companyRegNo: d.companyRegNo || null,
      companyAddress: d.companyAddress || null,
    })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
