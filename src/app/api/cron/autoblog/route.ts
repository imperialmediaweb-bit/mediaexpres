import { NextRequest, NextResponse } from "next/server";
import { cronAutorizat } from "@/lib/cron-auth";
import { publicaUrmatorul } from "@/lib/autoblog";
import { posteazaOferta } from "@/lib/oferta-facebook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Autoblogul (03.10.2026): la fiecare 30 de minute, din planificator. Publica
 * cel mult un articol pe apel, si doar daca i-a venit randul dupa ritmul
 * setat in /admin/autoblog. Idempotent: un apel in plus nu publica nimic.
 */
export async function POST(req: NextRequest) {
  if (!cronAutorizat(req.headers)) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });
  const r = await publicaUrmatorul();
  // Oferta zilnica pe Facebook (lib/oferta-facebook.ts): o data pe zi, la ora setata.
  const oferta = await posteazaOferta();
  return NextResponse.json({ ok: true, ...r, oferta });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
