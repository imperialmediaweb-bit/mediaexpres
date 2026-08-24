import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orderSubmissions } from "@/db/schema";

export const runtime = "nodejs";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }
  const [updated] = await db
    .update(orderSubmissions)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(orderSubmissions.id, params.id))
    .returning({ id: orderSubmissions.id });
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Nu există" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
