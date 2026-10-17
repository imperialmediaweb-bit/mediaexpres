import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { capturaSite } from "@/lib/captura-site";
import { creeazaLimita, ipDinCerere } from "@/lib/limita-ip";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 17.10.2026 — „Folosește o captură a site-ului meu" din formularul de
 * comanda, pentru cine n-are poze la indemana. Aceeasi captura pe care o
 * facem automat dupa plata cand lipsesc pozele (lib/captura-site.ts), doar
 * ca acum clientul o vede inainte sa trimita.
 */
const depasit = creeazaLimita(5, 60 * 60_000);
const schema = z.object({ siteUrl: z.string().min(4).max(300) });

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Scrie adresa site-ului firmei." }, { status: 400 });
  if (depasit(ipDinCerere(req))) {
    return NextResponse.json({ ok: false, error: "Prea multe capturi. Încearcă din nou peste o oră." }, { status: 429 });
  }

  const poza = await capturaSite(parsed.data.siteUrl, `formular-${crypto.randomUUID()}`);
  if (!poza) {
    return NextResponse.json(
      { ok: false, error: "Nu am putut face captura site-ului. Urcă o poză de pe calculator." },
      { status: 502 },
    );
  }
  const host = parsed.data.siteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  return NextResponse.json({ ok: true, poza: { url: poza.url, name: `captura-${host}.png` } });
}
