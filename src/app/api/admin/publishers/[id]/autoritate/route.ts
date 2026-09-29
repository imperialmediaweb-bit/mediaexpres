import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { publishers } from "@/db/schema";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { verificaAutoritate } from "@/lib/autoritate";

export const runtime = "nodejs";

/** Reverificarea manuala a autoritatii unei publicatii (Moz DA / Open PageRank). */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });
  await ensureOrderColumns();
  const [p] = await db.select().from(publishers).where(eq(publishers.id, params.id)).limit(1);
  if (!p) return NextResponse.json({ ok: false, error: "Publicație inexistentă" }, { status: 404 });

  if (!process.env.MOZ_API_TOKEN && !process.env.OPR_API_KEY) {
    return NextResponse.json({ ok: false, error: "Lipsește MOZ_API_TOKEN în Railway." }, { status: 503 });
  }
  const aut = await verificaAutoritate(p.siteUrl);
  if (!aut) {
    return NextResponse.json(
      { ok: false, error: "Moz nu a răspuns (sau tokenul e greșit). Încearcă peste câteva minute." },
      { status: 502 },
    );
  }
  await db.update(publishers).set({ ...aut, authorityCheckedAt: new Date() }).where(eq(publishers.id, p.id));
  return NextResponse.json({ ok: true, ...aut });
}
