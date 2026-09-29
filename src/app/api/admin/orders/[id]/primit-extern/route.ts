import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { ensureOrderColumns } from "@/lib/ensure-columns";

export const runtime = "nodejs";

/** Materialul a venit pe WhatsApp / email: comanda iese din lista „fara material" si din reamintiri. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });
  await ensureOrderColumns();
  const [o] = await db
    .update(orders)
    .set({ materialExternAt: new Date() })
    .where(eq(orders.id, params.id))
    .returning({ id: orders.id });
  if (!o) return NextResponse.json({ ok: false, error: "Comanda nu există." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
