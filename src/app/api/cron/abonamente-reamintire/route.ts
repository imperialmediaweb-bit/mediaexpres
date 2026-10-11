import { NextRequest, NextResponse } from "next/server";
import { cronAutorizat } from "@/lib/cron-auth";
import { trimiteReamintiriAbonamente } from "@/lib/abonament-reamintire";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Reamintirea dinainte de reinnoirea abonamentelor: o data pe ora, din planificator. */
export async function POST(req: NextRequest) {
  if (!cronAutorizat(req.headers)) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }
  try {
    const r = await trimiteReamintiriAbonamente();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    console.error("[abonamente-reamintire]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
