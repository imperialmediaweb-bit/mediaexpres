import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import { generateOutreachEmail } from "@/lib/ai";
import {
  sendEmail,
  wrapEmailCold,
  defaultListUnsubscribe,
  ADMIN_EMAIL,
  SENDER_NAME,
} from "@/lib/email";
import { isSuppressed } from "@/data/suppression-list";
import { signProspectToken } from "@/lib/prospect-token";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  prospectIds: z.array(z.string()).optional(),
  status: z.string().optional(),
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mediaexpress.ro";
const FOLLOWUP_1_DAYS = 5;
const FOLLOWUP_2_DAYS = 12;
const FOLLOWUP_3_DAYS = 21;
const DAY_MS = 86_400_000;

function htmlFromBody(body: string): string {
  return body
    .split(/\n\n+/)
    .map((para) => `<p style="margin:0 0 14px 0;">${para.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

// Plain-text alternative — spam filters favor email-urile cu ambele MIME parts.
// Body-ul de la AI vine deja ca text plain cu \n\n, deci e direct utilizabil.
function textFromBody(body: string, senderName: string): string {
  return `${body}\n\nCu drag,\n${senderName}\nMediaExpres · mediaexpress.ro\n\n---\nDacă nu vrei să mai primești emailuri, răspunde STOP.`;
}

export async function POST(req: NextRequest) {
  // OUTER try/catch — garantează că răspundem mereu cu JSON, niciodată HTML.
  // Fără acest wrap orice throw neprins (ex: import care nu se rezolvă, DB down,
  // OpenAI key invalid înainte de loop) ar produce un 500 HTML page din Next.js,
  // care apoi crapă client-side JSON.parse cu "Unexpected token '<', '<!DOCTYPE'".
  try {
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

    const rawRows = parsed.data.prospectIds && parsed.data.prospectIds.length > 0
      ? await db.select().from(prospects).where(inArray(prospects.id, parsed.data.prospectIds)).limit(limit)
      : await db
          .select()
          .from(prospects)
          .where(eq(prospects.status, targetStatus))
          .orderBy(asc(prospects.createdAt))
          .limit(limit);

    const rows = rawRows.filter((p) => !isSuppressed(p.email));
    const suppressedSkipped = rawRows.length - rows.length;

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

    const listUnsubscribe = defaultListUnsubscribe();

    let sent = 0;
    let failed = 0;
    let followUpsScheduled = 0;
    const errors: Array<{ id: string; companyName: string; error: string }> = [];

    for (const p of rows) {
      try {
        const token = signProspectToken(p.id);
        const ctaLink = `${SITE_URL}/oferta/${token}`;

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
            ctaLink,
          });
          subject = generated.subject;
          bodyText = generated.body;
        }

        if (!subject || !bodyText) {
          throw new Error("Lipseste subject sau body dupa generare");
        }

        const html = wrapEmailCold(htmlFromBody(bodyText));
        const text = textFromBody(bodyText, SENDER_NAME);

        const prospectTag = [{ name: "prospect_id", value: p.id }];

        const initial = await sendEmail({
          to: p.email,
          subject,
          html,
          text,
          replyTo: ADMIN_EMAIL,
          listUnsubscribe,
          tags: prospectTag,
        });

        if (!initial.ok) {
          throw new Error((initial as { error?: string }).error || "Resend a esuat la trimiterea initiala");
        }

        const followUp1At = new Date(Date.now() + FOLLOWUP_1_DAYS * DAY_MS).toISOString();
        const followUp1Subject = `Re: ${subject}`;
        const followUp1Body = `Salut,\n\nReiau scurt mesajul de saptamana trecuta. Iti las link-ul personalizat cu oferta + lista 50 ziare + formularul rapid:\n\n${ctaLink}\n\nDaca nu e momentul, raspunde cu STOP si te scot din lista. Niciun apel, niciun telefon - doar click pe link cand ai 2 minute.\n\nMultumesc,`;
        const followUp1Html = wrapEmailCold(htmlFromBody(followUp1Body));
        const followUp1Text = textFromBody(followUp1Body, SENDER_NAME);

        const followUp1 = await sendEmail({
          to: p.email,
          subject: followUp1Subject,
          html: followUp1Html,
          text: followUp1Text,
          replyTo: ADMIN_EMAIL,
          scheduledAt: followUp1At,
          listUnsubscribe,
          tags: prospectTag,
        });
        if (followUp1.ok) followUpsScheduled++;

        const followUp2At = new Date(Date.now() + FOLLOWUP_2_DAYS * DAY_MS).toISOString();
        const followUp2Subject = `Ultim mesaj — articol ${p.companyName} pe 50 ziare`;
        const followUp2Body = `Salut,\n\nUltima oara pe acest thread. Daca vrei sa publicam un articol pentru ${p.companyName} pe 50 de ziare, link-ul personalizat e activ:\n\n${ctaLink}\n\nNu trebuie sa scrii articolul - AI-ul nostru il genereaza din 1-2 propozitii de tematica. Tu trimiti doar 3 poze prin formularul de la link.\n\nDaca nu e relevant, raspunde STOP si inchid thread-ul.\n\nMultumesc,`;
        const followUp2Html = wrapEmailCold(htmlFromBody(followUp2Body));
        const followUp2Text = textFromBody(followUp2Body, SENDER_NAME);

        const followUp2 = await sendEmail({
          to: p.email,
          subject: followUp2Subject,
          html: followUp2Html,
          text: followUp2Text,
          replyTo: ADMIN_EMAIL,
          scheduledAt: followUp2At,
          listUnsubscribe,
          tags: prospectTag,
        });
        if (followUp2.ok) followUpsScheduled++;

        const followUp3At = new Date(Date.now() + FOLLOWUP_3_DAYS * DAY_MS).toISOString();
        const followUp3Subject = `Inchid thread-ul - confirmi?`;
        const followUp3Body = `Salut,\n\nNu am primit raspuns, deci presupun ca nu e momentul. Inchid thread-ul.\n\nLink-ul ramane activ inca o saptamana daca te razgandesti:\n\n${ctaLink}\n\nMult succes cu ${p.companyName}.`;
        const followUp3Html = wrapEmailCold(htmlFromBody(followUp3Body));
        const followUp3Text = textFromBody(followUp3Body, SENDER_NAME);

        const followUp3 = await sendEmail({
          to: p.email,
          subject: followUp3Subject,
          html: followUp3Html,
          text: followUp3Text,
          replyTo: ADMIN_EMAIL,
          scheduledAt: followUp3At,
          listUnsubscribe,
          tags: prospectTag,
        });
        if (followUp3.ok) followUpsScheduled++;

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
      suppressedSkipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Eroare server necunoscuta";
    console.error("[batch-send] Top-level error:", e);
    return NextResponse.json(
      { ok: false, error: `Server crash: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Eroare server necunoscuta";
    console.error("[batch-send GET] Top-level error:", e);
    return NextResponse.json(
      { ok: false, error: `Server crash: ${message}` },
      { status: 500 }
    );
  }
}
