import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  sendEmail,
  wrapEmail,
  wrapEmailCold,
  escapeHtml,
  ADMIN_EMAIL,
} from "@/lib/email";

export const runtime = "nodejs";

// Resend accepta programari pana la 30 de zile in avans.
const MAX_SCHEDULE_DAYS = 30;
const MAX_RECIPIENTS = 50;

const schema = z.object({
  recipients: z.array(z.string().email()).min(1).max(MAX_RECIPIENTS),
  subject: z.string().min(2).max(200),
  body: z.string().min(10).max(20000),
  // brand = antetul MediaExpres; personal = scrisoare simpla (ton 1:1)
  template: z.enum(["brand", "personal"]).default("brand"),
  // ISO; lipsa = trimite acum
  scheduledAt: z.string().datetime({ offset: true }).optional(),
});

/** Text simplu -> HTML de email: escapat + paragrafe pe linii goale. */
function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 14px;">${escapeHtml(para.trim()).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  if (d.scheduledAt) {
    const when = new Date(d.scheduledAt).getTime();
    const now = Date.now();
    if (when <= now + 60_000) {
      return NextResponse.json(
        { ok: false, error: "Ora programată trebuie să fie în viitor (minim 1 minut)" },
        { status: 400 },
      );
    }
    if (when > now + MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { ok: false, error: `Resend acceptă programări de maximum ${MAX_SCHEDULE_DAYS} de zile` },
        { status: 400 },
      );
    }
  }

  const contentHtml = textToHtml(d.body);
  const html =
    d.template === "brand"
      ? wrapEmail(escapeHtml(d.subject), contentHtml)
      : wrapEmailCold(contentHtml);

  const results: { to: string; ok: boolean; error?: string }[] = [];
  for (const to of d.recipients) {
    const r = await sendEmail({
      to,
      subject: d.subject,
      html,
      replyTo: ADMIN_EMAIL,
      ...(d.scheduledAt ? { scheduledAt: d.scheduledAt } : {}),
    });
    results.push({ to, ok: r.ok, ...(r.ok ? {} : { error: (r as { error?: string }).error }) });
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    ok: failed.length === 0,
    sent,
    failed,
    scheduled: Boolean(d.scheduledAt),
    ...(failed.length > 0
      ? { error: `${failed.length} din ${results.length} nu au putut fi trimise` }
      : {}),
  });
}
