import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchSiteContext } from "@/lib/site-context";
import { generateAdvertorial, TIPURI_ARTICOL } from "@/lib/advertorial";
import { creeazaLimita, ipDinCerere } from "@/lib/limita-ip";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 17.10.2026 — articolul scris din site-ul clientului, INAINTE de plata, in
 * formularul de comanda. Omul care vede articolul lui gata scris plateste mai
 * usor decat cel caruia i se cer banii pe o promisiune.
 *
 * Fara token de comanda (comanda nu exista inca), deci singura aparare e
 * limita pe IP: 3 variante, cat i-am promis clientului.
 */
const depasit = creeazaLimita(3, 6 * 60 * 60_000);

const schema = z.object({
  siteUrl: z.string().min(4).max(300),
  brief: z.string().max(2000).optional().default(""),
  companyName: z.string().max(200).optional(),
  tip: z.enum(TIPURI_ARTICOL).default("advertorial"),
  cuvantCheie: z.string().max(120).optional(),
  linkuri: z.string().max(1500).optional(),
  isCasino: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Scrie adresa site-ului firmei." }, { status: 400 });
  }
  const d = parsed.data;

  if (depasit(ipDinCerere(req))) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Ai folosit cele 3 variante de articol. Alege una dintre ele, modifică textul cum vrei, sau trimite comanda cu „Îl trimit după plată”.",
      },
      { status: 429 },
    );
  }

  const site = await fetchSiteContext(d.siteUrl);
  if (!site) {
    return NextResponse.json(
      { ok: false, error: "Nu am putut deschide site-ul. Verifică adresa sau scrie în câteva propoziții despre firmă." },
      { status: 422 },
    );
  }

  const brief = [
    d.brief.trim() || "Prezintă firma, ce face și de ce merită aleasă, pe baza informațiilor de pe site-ul ei.",
    "La finalul articolului pune un paragraf scurt cu datele de contact ale firmei (telefon, email, adresă, site) — DOAR cele care apar în textul site-ului; nu inventa niciunul.",
  ].join("\n\n");

  try {
    const article = await generateAdvertorial({
      brief,
      tip: d.tip,
      cuvantCheie: d.cuvantCheie?.trim() || undefined,
      linkuri: d.linkuri?.trim() || undefined,
      companyName: d.companyName?.trim() || undefined,
      siteUrl: site.url,
      siteContext: [site.title, site.description, site.text].filter(Boolean).join("\n"),
      isCasino: d.isCasino,
    });
    return NextResponse.json({ ok: true, article });
  } catch (err) {
    console.error("[articol/genereaza] error:", err);
    return NextResponse.json(
      { ok: false, error: "Generarea a eșuat. Încearcă din nou peste un minut." },
      { status: 500 },
    );
  }
}
