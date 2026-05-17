import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyFbLeadToken } from "@/lib/fb-lead-token";
import { sendEmail, wrapEmail, ADMIN_EMAIL } from "@/lib/email";

const schema = z.object({
  token: z.string().min(10),
  question: z.string().min(3).max(2000),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const lead = verifyFbLeadToken(parsed.data.token);
  if (!lead) return NextResponse.json({ ok: false, error: "Token invalid" }, { status: 400 });

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `❓ Întrebare ofertă — ${lead.name}`,
    html: wrapEmail(
      `Întrebare de la ${lead.name}`,
      `
      <p><strong>De la:</strong> ${lead.name}</p>
      <p><strong>Email:</strong> ${lead.email}</p>
      <p><strong>Telefon:</strong> ${lead.phone}</p>
      <div style="background:#f8f5f0;border-left:4px solid #c1121f;padding:16px;border-radius:4px;margin:16px 0;">
        <p style="margin:0;font-size:16px;">${parsed.data.question.replace(/\n/g, "<br/>")}</p>
      </div>
      <p style="color:#64748b;font-size:12px;">Răspunde direct la emailul lui: ${lead.email}</p>
      `,
    ),
    replyTo: lead.email,
  });

  return NextResponse.json({ ok: true });
}
