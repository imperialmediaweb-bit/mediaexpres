import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { clientMessages } from "@/db/schema";
import { sendEmail, wrapEmail, escapeHtml } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(200),
  body: z.string().min(2).max(5000),
  // Marcheaza rezolvate mesajele clientului din firul asta.
  markHandled: z.boolean().default(true),
});

/** Raspunsul nostru la un mesaj din contul clientului. */
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const email = d.email.toLowerCase();

  try {
    await db.insert(clientMessages).values({
      email,
      fromClient: false,
      body: d.body,
      attachments: "[]",
      handled: true,
    });
    if (d.markHandled) {
      await db
        .update(clientMessages)
        .set({ handled: true })
        .where(and(eq(clientMessages.email, email), eq(clientMessages.fromClient, true)));
    }
  } catch (err) {
    console.error("[admin/mesaje] db error:", err);
    return NextResponse.json({ ok: false, error: "Eroare la salvare" }, { status: 500 });
  }

  // Clientul e anuntat pe email ca are raspuns in cont.
  sendEmail({
    to: email,
    subject: "Ai un răspuns nou în contul MediaExpres",
    html: wrapEmail(
      "Ți-am răspuns",
      `
      <div style="white-space:pre-wrap;border-left:3px solid #e5e5e5;padding-left:16px;margin:16px 0;color:#334155;">${escapeHtml(d.body)}</div>
      <p style="margin:24px 0;text-align:center;"><a href="${SITE.url}/cont/mesaje" style="display:inline-block;background:#c1121f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Vezi conversația în cont</a></p>
      <p>Poți răspunde direct la acest email sau din contul tău.</p>
      `,
    ),
  }).catch((e) => console.error("[admin/mesaje] mail client:", e));

  return NextResponse.json({ ok: true });
}
