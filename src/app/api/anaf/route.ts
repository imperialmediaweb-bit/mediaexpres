import { NextRequest, NextResponse } from "next/server";
import { lookupCui } from "@/lib/anaf";
import { creeazaLimita, ipDinCerere } from "@/lib/limita-ip";

export const runtime = "nodejs";

// 17.10.2026 — butonul „Caută firma" din formularul de comanda: clientul scrie
// CUI-ul, iar numele si adresa vin de la ANAF, ca la emiterea manuala in StartCo.
const depasit = creeazaLimita(30, 10 * 60_000);

export async function GET(req: NextRequest) {
  if (depasit(ipDinCerere(req))) {
    return NextResponse.json(
      { ok: false, error: "Prea multe căutări. Încearcă din nou în câteva minute." },
      { status: 429 },
    );
  }
  const cui = req.nextUrl.searchParams.get("cui") || "";
  const r = await lookupCui(cui);

  if (r.status === "invalid") {
    return NextResponse.json({ ok: false, error: "CUI-ul are doar cifre (ex. 12345678 sau RO12345678)." });
  }
  if (r.status === "not_found") {
    return NextResponse.json({ ok: false, error: "Nu am găsit firma la ANAF. Verifică CUI-ul." });
  }
  if (r.status === "error") {
    // ANAF picat: nu blocam comanda — clientul completeaza de mana.
    return NextResponse.json({ ok: false, anafIndisponibil: true, error: "ANAF nu răspunde acum. Completează numele firmei și adresa de mână." });
  }
  const c = r.company;
  if (c.deregistered) {
    return NextResponse.json({ ok: false, error: `Firma ${c.name} apare radiată la ANAF. Verifică CUI-ul.` });
  }
  return NextResponse.json({
    ok: true,
    firma: { cui: c.cui, nume: c.name, adresa: c.address, inactiva: c.inactive },
  });
}
