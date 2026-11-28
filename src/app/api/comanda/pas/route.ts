import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inregistreazaPas, PASI_FUNNEL } from "@/lib/funnel-comanda";
import { creeazaLimita, ipDinCerere } from "@/lib/limita-ip";

export const runtime = "nodejs";

// 28.11.2026 — pasii formularului de comanda (lib/funnel-comanda.ts).
const depasit = creeazaLimita(120, 60 * 60_000);
const schema = z.object({
  sid: z.string().regex(/^[a-z0-9]{8,40}$/i),
  pas: z.enum(PASI_FUNNEL),
  eroare: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  if (depasit(ipDinCerere(req))) return NextResponse.json({ ok: true });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const p = schema.safeParse(raw);
  if (!p.success) return NextResponse.json({ ok: false }, { status: 400 });
  await inregistreazaPas(p.data.sid, p.data.pas, p.data.eroare).catch((e) => console.error("[comanda/pas]", e));
  return NextResponse.json({ ok: true });
}
