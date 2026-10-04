import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { trimiteComandaInRetea } from "@/lib/retea";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Butonul „Trimite în rețea" / „Retrimite" din pagina comenzii (04.10.2026). */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });
  const r = await trimiteComandaInRetea(params.id);
  return r.ok ? NextResponse.json({ ok: true, id: r.id, actualizata: r.actualizata }) : NextResponse.json({ ok: false, error: r.motiv }, { status: 502 });
}
