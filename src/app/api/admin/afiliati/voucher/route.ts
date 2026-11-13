import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { afiliatDupaId, inregistreazaVoucher } from "@/lib/afiliati";
import { sendEmail, wrapEmail, escapeHtml as esc } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

/** Adminul trimite un voucher eMAG unui partener persoana fizica (vezi admin/recomandari). */
export async function POST(req: NextRequest) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { afiliatId?: number; cod?: string; suma?: number };
  const cod = String(b.cod || "").trim();
  const suma = Math.round(Number(b.suma) || 0);
  if (!b.afiliatId || cod.length < 4 || suma < 1 || suma > 5000) {
    return NextResponse.json({ ok: false, error: "Date invalide (cod sau sumă)" }, { status: 400 });
  }
  const a = await afiliatDupaId(Number(b.afiliatId));
  if (!a) return NextResponse.json({ ok: false, error: "Partenerul nu există" }, { status: 404 });

  const trimis = await sendEmail({
    to: a.email,
    subject: `Voucherul dumneavoastră eMAG de ${suma} lei — MediaExpres`,
    html: wrapEmail(
      "Mulțumim pentru recomandare!",
      `<p>Bună ziua${a.nume ? " " + esc(a.nume.split(/\s+/)[0]) : ""},</p>
      <p>Clientul recomandat de dumneavoastră a plătit. Iată voucherul eMAG câștigat:</p>
      <p style="font-size:22px;font-weight:700;letter-spacing:1px;margin:16px 0;padding:14px;background:#f1f5f9;border-radius:8px;text-align:center;">${esc(cod)}</p>
      <p>Valoare: <strong>${suma} lei</strong>. Îl folosiți pe emag.ro, la finalizarea comenzii.</p>
      <p>Vă mulțumim! Linkul dumneavoastră rămâne activ: <a href="${SITE.url}/p/${a.cod}">${SITE.url}/p/${a.cod}</a></p>`,
    ),
  }).catch((e) => {
    console.error("[voucher] email", e);
    return null;
  });
  if (!trimis || !(trimis as { ok?: boolean }).ok) {
    return NextResponse.json({ ok: false, error: "Emailul nu a putut fi trimis" }, { status: 502 });
  }
  await inregistreazaVoucher(a.id, suma, cod);
  return NextResponse.json({ ok: true });
}
