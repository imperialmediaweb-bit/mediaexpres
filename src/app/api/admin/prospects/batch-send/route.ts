import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { and, eq, inArray, asc } from "drizzle-orm";
import { generateOutreachEmail } from "@/lib/ai";
import { sendEmail, wrapEmail, ADMIN_EMAIL } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  prospectIds: z.array(z.string()).optional(),
  status: z.string().optional(),
});

const FOLLOW_UP_DAYS = 5;
const DAY_MS = 86_400_000;

function htmlFromBody(body: string): string {
  return body
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`)
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
    body = {};
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  }

  const limit = parsed.data.limit ?? 30;
  const targetStatus = parsed.data.status ?? "new";

  const rows = parsed.data.prospectIds && parsed.data.prospectIds.length > 0
    ? await db.select().from(prospects).where(inArray(prospects.id, parsed.data.prospectIds)).limit(limit)
    : await db
        .select()
        .from(prospects)
        .where(eq(prospects.status, targetStatus))
        .orderBy(asc(prospects.createdAt))
        .limit(limit);

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      total: 0,
      sent: 0,
      failed: 0,
      followUpsScheduled: 0,
      message: `Niciun prospect cu status '${targetStatus}'`,
    });
  }

  let sent = 0;
  let failed = 0;
  let followUpsScheduled = 0;
  const errors: Array<{ id: string; companyName: string; error: string }> = [];

  for (const p of rows) {
    try {
      let subject = p.lastEmailSubject;
      let bodyText = p.lastEmailBody;
      const hasCachedDraft = !!(subject && bodyText && p.status === "new" && p.emailsSent === 0);

      if (!hasCachedDraft) {
        const generated = await generateOutreachEmail({
          companyName: p.companyName,
          industry: p.industry || undefined,
          city: p.city || undefined,
          website: p.website || undefined,
          notes: p.notes || undefined,
        });
        subject = generated.subject;
        bodyText = generated.body;
      }

      if (!subject || !bodyText) {
        throw new Error("Lipseste subject sau body dupa generare");
      }

      const html = wrapEmail(subject, htmlFromBody(bodyText));

      const initial = await sendEmail({
        to: p.email,
        subject,
        html,
        replyTo: ADMIN_EMAIL,
      });

      if (!initial.ok) {
        throw new Error((initial as { error?: string }).error || "Resend a esuat la trimiterea initiala");
      }

      const followUpAt = new Date(Date.now() + FOLLOW_UP_DAYS * DAY_MS).toISOString();
      const followUpSubject = `Re: ${subject}`;
      const followUpBody = `Salut,\n\nReiau scurt mesajul de saptamana trecuta. Daca ai 30 de secunde, raspunde-mi cu un DA si trimit oferta completa + factura proforma pe email.\n\nDaca nu e momentul, raspunde cu STOP si te scot din lista.\n\nMultumesc,\nEchipa MediaExpres - mediaexpress.ro`;
      const followUpHtml = wrapEmail(followUpSubject, htmlFromBody(followUpBody));

      const followUp = await sendEmail({
        to: p.email,
        subject: followUpSubject,
        html: followUpHtml,
        replyTo: ADMIN_EMAIL,
        scheduledAt: followUpAt,
      });

      if (followUp.ok) followUpsScheduled++;

      await db
        .update(prospects)
        .set({
          status: "contacted",
          emailsSent: (p.emailsSent || 0) + 1,
          lastEmailAt: new Date(),
          lastEmailSubject: subject,
          lastEmailBody: bodyText,
          updatedAt: new Date(),
        })
        .where(eq(prospects.id, p.id));

      sent++;
    } catch (e: unknown) {
      failed++;
      errors.push({
        id: p.id,
        companyName: p.companyName,
        error: e instanceof Error ? e.message : "Eroare necunoscuta",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    sent,
    failed,
    followUpsScheduled,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  const newCount = await db
    .select()
    .from(prospects)
    .where(eq(prospects.status, "new"));

  return NextResponse.json({
    ok: true,
    availableForBatch: newCount.length,
  });
}
