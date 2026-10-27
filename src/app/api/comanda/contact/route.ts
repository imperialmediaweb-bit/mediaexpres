import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";
import { findPackageById } from "@/data/packages";
import { sursaDinCerere, etichetaSursa } from "@/lib/sursa";
import { creeazaLimita, ipDinCerere } from "@/lib/limita-ip";

export const runtime = "nodejs";

/**
 * 28.10.2026 — din 23.10, ~24 de oameni veniti din reclama pe telefon au
 * deschis formularul de comanda si niciunul n-a trecut de primul camp (CUI-ul).
 * Plecau fara urma. Acum formularul cere intai emailul si telefonul, iar cand
 * sunt scrise, proprietarul primeste imediat un email cu ele — ca sa-l poata
 * suna chiar daca omul nu termina comanda.
 */

const depasit = creeazaLimita(5, 60 * 60_000);

const schema = z.object({
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(9).max(30),
  packageId: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  if (depasit(ipDinCerere(req))) return NextResponse.json({ ok: true });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || parsed.data.phone.replace(/\D/g, "").length < 9) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { email, phone, packageId } = parsed.data;
  const pachet = (packageId && findPackageById(packageId)?.name) || packageId || "—";
  await sendEmail({
    to: ADMIN_EMAIL,
    replyTo: email,
    subject: `[Început de comandă] ${phone} — ${email}`,
    html: wrapEmail(
      "Cineva a început o comandă",
      `<p>A scris emailul și telefonul în formularul de comandă. Dacă nu primești comanda în câteva minute, sună-l.</p>
      <table style="width:100%;border-collapse:collapse;">
        ${kv("Telefon", phone)}
        ${kv("Email", email)}
        ${kv("Pachet", pachet)}
        ${kv("De unde a venit", etichetaSursa(sursaDinCerere(req)))}
      </table>`,
    ),
  }).catch((e) => console.error("[comanda/contact]", e));
  return NextResponse.json({ ok: true });
}
