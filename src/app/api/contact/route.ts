import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/validators";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 }
    );
  }
  const data = parsed.data;
  if (data.website) return NextResponse.json({ ok: true });

  const html = wrapEmail(
    "Mesaj nou contact",
    `
    <table style="width:100%;border-collapse:collapse;">
      ${kv("Nume", data.name)}
      ${kv("Email", data.email)}
      ${kv("Subiect", data.subject)}
    </table>
    <div style="margin-top:20px;padding:16px;background:#F8F5F0;border-radius:8px;">
      <strong style="color:#0B2545;">Mesaj:</strong>
      <p style="margin:8px 0 0;white-space:pre-wrap;color:#334155;">${data.message.replace(/</g, "&lt;")}</p>
    </div>
  `
  );

  const r = await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[Contact] ${data.subject}`,
    html,
    replyTo: data.email,
  });

  if (!r.ok) {
    return NextResponse.json({ ok: false, error: "Eroare" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
