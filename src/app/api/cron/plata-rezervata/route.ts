import { NextRequest, NextResponse } from "next/server";
import { cronAutorizat } from "@/lib/cron-auth";
import { verificaRezervarile } from "@/lib/plata-rezervata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Plata rezervata: alerte la 48h si anulare la 72h. O data pe ora, din planificator. */
export async function POST(req: NextRequest) {
  if (!cronAutorizat(req.headers)) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }
  try {
    const r = await verificaRezervarile();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    console.error("[plata-rezervata]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
