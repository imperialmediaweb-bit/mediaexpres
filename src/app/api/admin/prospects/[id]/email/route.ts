import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateOutreachEmail } from "@/lib/ai";
import { sendEmail, wrapEmail, ADMIN_EMAIL } from "@/lib/email";

export const runtime = "nodejs";

const schema = z.object({
  action: z.enum(["generate", "send"]),
  subject: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });

  const [p] = await db.select().from(prospects).where(eq(prospects.id, params.id)).limit(1);
  if (!p) return NextResponse.json({ ok: false, error: "Prospect inexistent" }, { status: 404 });

  if (parsed.data.action === "generate") {
    try {
      const out = await generateOutreachEmail({
        companyName: p.companyName,
        industry: p.industry || undefined,
        city: p.city || undefined,
        website: p.website || undefined,
        notes: p.notes || undefined,
      });
      return NextResponse.json({ ok: true, subject: out.subject, body: out.body });
    } catch (e: unknown) {
      console.error("[admin/prospects/email] generate error", e);
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Eroare" }, { status: 500 });
    }
  }

  if (!parsed.data.subject || !parsed.data.body) {
    return NextResponse.json({ ok: false, error: "Subject si body sunt obligatorii la trimitere" }, { status: 400 });
  }

  const html = wrapEmail(
    parsed.data.subject,
    parsed.data.body
      .split(/\n\n+/)
      .map((para) => `<p>${para.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`)
      .join("")
  );

  const result = await sendEmail({
    to: p.email,
    subject: parsed.data.subject,
    html,
    replyTo: ADMIN_EMAIL,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "Eroare la trimitere: " + (result as { error?: string }).error }, { status: 500 });
  }

  await db
    .update(prospects)
    .set({
      status: "contacted",
      emailsSent: (p.emailsSent || 0) + 1,
      lastEmailAt: new Date(),
      lastEmailSubject: parsed.data.subject,
      lastEmailBody: parsed.data.body,
      updatedAt: new Date(),
    })
    .where(eq(prospects.id, params.id));

  return NextResponse.json({ ok: true });
}
