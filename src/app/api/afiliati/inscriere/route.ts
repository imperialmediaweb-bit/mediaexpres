import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { creeazaAfiliat, COMISION_LEI, COMISION_PRIMUL_LEI } from "@/lib/afiliati";
import { lookupCui } from "@/lib/anaf";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";
import { creeazaLimita, ipDinCerere } from "@/lib/limita-ip";

export const runtime = "nodejs";

const depasit = creeazaLimita(5, 60 * 60_000);

// 13.11.2026 — doua feluri de parteneri: PFA/firma (bani pe factura, CUI + IBAN
// obligatorii) si persoana fizica (vouchere eMAG, fara CUI/IBAN).
const schema = z.object({
  tip: z.enum(["firma", "persoana"]).default("firma"),
  nume: z.string().trim().min(3).max(100),
  cui: z.string().trim().max(20).optional().default(""),
  iban: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((v) => v.replace(/\s+/g, "").toUpperCase()),
  email: z.string().trim().email().max(200),
  telefon: z.string().trim().min(9).max(30),
});

/** Inscrierea in programul de recomandari: CUI verificat la ANAF, link pe loc. */
export async function POST(req: NextRequest) {
  if (depasit(ipDinCerere(req))) {
    return NextResponse.json({ ok: false, error: "Prea multe încercări. Reîncercați peste o oră." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.errors[0]?.message || "Date invalide" }, { status: 400 });
  }
  const d = parsed.data;

  let firma = "Persoană fizică (vouchere eMAG)";
  if (d.tip === "firma") {
    // PFA sau firma: comisionul se plateste pe factura lor.
    if (d.cui.length < 2) return NextResponse.json({ ok: false, error: "Scrieți CUI-ul firmei sau al PFA." }, { status: 400 });
    if (!/^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(d.iban)) {
      return NextResponse.json({ ok: false, error: "IBAN invalid" }, { status: 400 });
    }
    const anaf = await lookupCui(d.cui);
    if (anaf.status === "invalid" || anaf.status === "not_found") {
      return NextResponse.json(
        { ok: false, error: "CUI-ul nu a fost găsit la ANAF. Dacă nu aveți firmă, alegeți „Persoană fizică — vouchere eMAG”." },
        { status: 400 },
      );
    }
    firma = anaf.status === "found" ? anaf.company.name : d.cui;
  }

  const r = await creeazaAfiliat({ ...d, cui: d.tip === "firma" ? d.cui : "", iban: d.tip === "firma" ? d.iban : "", firma });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.eroare }, { status: 400 });
  const a = r.afiliat;
  const link = `${SITE.url}/p/${a.cod}`;
  const cont = `${SITE.url}/recomanda/cont/${a.token}`;

  await Promise.all([
    sendEmail({
      to: a.email,
      subject: "Linkul dumneavoastră de partener MediaExpres",
      html: wrapEmail(
        "Bine ați venit în programul de parteneri",
        `<p>Bună ziua${a.nume ? " " + esc(a.nume.split(/\s+/)[0]) : ""},</p>
        <p>Acesta este linkul dumneavoastră personal. Pentru primul client care comandă prin el și plătește primiți <strong>${COMISION_PRIMUL_LEI} lei</strong>, apoi <strong>${COMISION_LEI} lei</strong> pentru fiecare client${a.tip === "persoana" ? " — <strong>în vouchere eMAG</strong>, trimise pe email" : ""}.</p>
        <p style="font-size:16px;font-weight:700;margin:16px 0;"><a href="${link}">${link}</a></p>
        <p>În contul dumneavoastră găsiți butoane de distribuire pe WhatsApp, Facebook și LinkedIn, texte gata scrise, bannere pentru site și imagini pentru postări, toate cu linkul dumneavoastră inclus:</p>
        <p style="margin:20px 0;"><a href="${cont}" style="background:#0f172a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Contul meu de partener</a></p>
        <p style="color:#64748b;font-size:13px;">Păstrați acest email: linkul contului este personal. ${a.tip === "persoana" ? "Voucherele eMAG vi le trimitem pe email, după ce clientul adus a plătit." : "Comisioanele se plătesc lunar, pe baza facturii dumneavoastră, pentru comenzile încasate în luna anterioară."}</p>`,
      ),
    }).catch((e) => console.error("[afiliati] email partener", e)),
    sendEmail({
      to: ADMIN_EMAIL,
      replyTo: a.email,
      subject: `[Partener nou] ${a.nume} — ${firma}`,
      html: wrapEmail(
        "Partener nou în programul de recomandări",
        `<table style="width:100%;border-collapse:collapse;">
          ${kv("Nume", a.nume)}${kv("Tip", a.tip === "persoana" ? "Persoană fizică — vouchere eMAG" : "PFA / firmă — bani pe factură")}${kv("Firmă / PFA", firma)}${kv("CUI", a.cui || "—")}${kv("IBAN", a.iban || "—")}
          ${kv("Email", a.email)}${kv("Telefon", a.telefon)}${kv("Link", link)}
        </table>`,
      ),
    }).catch((e) => console.error("[afiliati] email admin", e)),
  ]);

  return NextResponse.json({ ok: true, link, cont });
}
