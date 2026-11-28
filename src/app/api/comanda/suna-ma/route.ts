import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";
import { trimitePushAdmin } from "@/lib/admin-push";
import { creeazaLimita, ipDinCerere } from "@/lib/limita-ip";
import { linkSunaLead } from "@/lib/lead-suna";

export const runtime = "nodejs";

// 28.11.2026 (owner) — „Sunați-mă" din formularul de comanda: notificare pe
// telefonul adminului + email, cu numarul omului.
const depasit = creeazaLimita(3, 60 * 60_000);
const schema = z.object({
  phone: z.string().trim().min(9).max(30),
  email: z.string().trim().max(200).optional(),
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
  if (!p.success || p.data.phone.replace(/\D/g, "").length < 9) {
    return NextResponse.json({ ok: false, error: "Scrie numărul de telefon." }, { status: 400 });
  }
  const { phone, email } = p.data;
  await trimitePushAdmin("📞 Vrea să fie sunat ACUM", `${phone}${email ? ` · ${email}` : ""} — din formularul de comandă`, linkSunaLead(phone, email, "suna-ma")).catch(() => undefined);
  await sendEmail({
    to: ADMIN_EMAIL,
    replyTo: email || undefined,
    subject: `[Sunați-mă] ${phone}${email ? ` — ${email}` : ""}`,
    html: wrapEmail(
      "Vrea să fie sunat",
      `<p>A apăsat „Sunați-mă” în formularul de comandă. Sună-l acum, cât e pe pagină.</p>
      <table style="width:100%;border-collapse:collapse;">${kv("Telefon", phone)}${kv("Email", email || "—")}</table>`,
    ),
  }).catch((e) => console.error("[comanda/suna-ma]", e));
  return NextResponse.json({ ok: true });
}
