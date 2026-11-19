import { NextRequest, NextResponse } from "next/server";
import { cronAutorizat } from "@/lib/cron-auth";
import { ruleazaConfirmarePlata } from "@/lib/confirmare-plata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 19.11.2026 — e-mail „confirmați transferul" la 30 min dupa factura OP; reamintire la 2 zile. `?proba=1` = doar lista. */
export async function POST(req: NextRequest) {
  if (!cronAutorizat(req.headers)) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }
  try {
    const r = await ruleazaConfirmarePlata({ proba: req.nextUrl.searchParams.get("proba") === "1" });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
