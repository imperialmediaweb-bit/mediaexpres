import { NextRequest, NextResponse } from "next/server";
import { cronAutorizat } from "@/lib/cron-auth";
import { publicaUrmatorul, posturiPublicate } from "@/lib/autoblog";
import { posteazaUrmatorulPeLinkedIn, posteazaOfertaPeLinkedIn } from "@/lib/linkedin";
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
  // 23.11.2026 — LinkedIn: o postare pe zi; o data la 4 zile Oferta 500, altfel
  // cel mai nou articol de blog inca nepostat (lib/linkedin.ts).
  let linkedin: unknown = null;
  try {
    const of = await posteazaOfertaPeLinkedIn();
    linkedin = of.postat ? { oferta: true } : await posteazaUrmatorulPeLinkedIn(await posturiPublicate(200));
  } catch (e) {
    linkedin = { eroare: e instanceof Error ? e.message : String(e) };
  }
  return NextResponse.json({ ok: true, ...r, oferta, linkedin });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
