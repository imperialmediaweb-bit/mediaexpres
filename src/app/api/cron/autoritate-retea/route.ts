import { NextRequest, NextResponse } from "next/server";
import { cronAutorizat } from "@/lib/cron-auth";
import { actualizeazaAutoritateaRetelei } from "@/lib/autoritate-retea";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Scorurile Moz ale ziarelor noastre, reimprospatate la 30 de zile (planificatorul intern, zilnic). */
export async function POST(req: NextRequest) {
  if (!cronAutorizat(req.headers)) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }
  try {
    const r = await actualizeazaAutoritateaRetelei();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
