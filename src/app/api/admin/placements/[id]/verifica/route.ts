import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { placements, publishers } from "@/db/schema";
import { ensureOrderColumns, ensurePlacementTables } from "@/lib/ensure-columns";
import { verificaPlasare } from "@/lib/ruleaza-paza";

export const runtime = "nodejs";

/** „Verifica acum" din admin: aceeasi verificare ca paza linkurilor, pe loc. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });
  await Promise.all([ensureOrderColumns(), ensurePlacementTables()]);
  const [pl] = await db.select().from(placements).where(eq(placements.id, params.id)).limit(1);
  if (!pl?.publishedUrl) return NextResponse.json({ ok: false, error: "Nu e publicat încă." }, { status: 409 });
  const [pub] = await db.select().from(publishers).where(eq(publishers.id, pl.publisherId)).limit(1);
  const r = await verificaPlasare(pl, pub);
  await db
    .update(placements)
    .set({
      linkStatus: r.stare,
      linkDetail: r.detalii,
      linkCheckedAt: new Date(),
      ...(r.stare === "ok" ? { linkFailCount: 0, linkAlertAt: null, linkEscalatedAt: null } : {}),
    })
    .where(eq(placements.id, pl.id));
  return NextResponse.json({ ok: true, ...r });
}
