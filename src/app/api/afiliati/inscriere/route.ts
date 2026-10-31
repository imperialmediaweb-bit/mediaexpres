import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { creeazaAfiliat, COMISION_LEI } from "@/lib/afiliati";
import { lookupCui } from "@/lib/anaf";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";
import { creeazaLimita, ipDinCerere } from "@/lib/limita-ip";

export const runtime = "nodejs";

const depasit = creeazaLimita(5, 60 * 60_000);

const schema = z.object({
  nume: z.string().trim().min(3).max(100),
  cui: z.string().trim().min(2).max(20),
  iban: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, "").toUpperCase())
    .refine((v) => /^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(v), "IBAN invalid"),
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

  // Doar PFA sau firma: comisionul se plateste pe factura lor.
  const anaf = await lookupCui(d.cui);
  if (anaf.status === "invalid" || anaf.status === "not_found") {
    return NextResponse.json(
      { ok: false, error: "CUI-ul nu a fost găsit la ANAF. Programul este pentru PFA sau firme." },
      { status: 400 },
    );
  }
  const firma = anaf.status === "found" ? anaf.company.name : d.cui;

  const r = await creeazaAfiliat({ ...d, firma });
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
        <p>Acesta este linkul dumneavoastră personal. Pentru fiecare client care comandă prin el și plătește, primiți <strong>${COMISION_LEI} lei</strong>.</p>
        <p style="font-size:16px;font-weight:700;margin:16px 0;"><a href="${link}">${link}</a></p>
        <p>Clienții, comisioanele și materialele de promovare le găsiți în contul dumneavoastră:</p>
        <p style="margin:20px 0;"><a href="${cont}" style="background:#0f172a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Contul meu de partener</a></p>
        <p style="color:#64748b;font-size:13px;">Păstrați acest email: linkul contului este personal. Comisioanele se plătesc lunar, pe baza facturii dumneavoastră, pentru comenzile încasate în luna anterioară.</p>`,
      ),
    }).catch((e) => console.error("[afiliati] email partener", e)),
    sendEmail({
      to: ADMIN_EMAIL,
      replyTo: a.email,
      subject: `[Partener nou] ${a.nume} — ${firma}`,
      html: wrapEmail(
        "Partener nou în programul de recomandări",
        `<table style="width:100%;border-collapse:collapse;">
          ${kv("Nume", a.nume)}${kv("Firmă / PFA", firma)}${kv("CUI", a.cui)}${kv("IBAN", a.iban)}
          ${kv("Email", a.email)}${kv("Telefon", a.telefon)}${kv("Link", link)}
        </table>`,
      ),
    }).catch((e) => console.error("[afiliati] email admin", e)),
  ]);

  return NextResponse.json({ ok: true, link, cont });
}
