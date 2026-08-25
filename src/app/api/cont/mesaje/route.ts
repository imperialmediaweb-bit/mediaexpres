import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { clientMessages } from "@/db/schema";
import { sendEmail, wrapEmail, escapeHtml, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

const schema = z.object({
  body: z.string().min(5).max(5000),
  attachments: z
    .array(z.object({ url: z.string().url().max(500), name: z.string().max(200) }))
    .max(5)
    .default([]),
});

/** Clientul scrie din contul lui. Mesajul ajunge in admin ca sarcina + pe email. */
export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
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

  try {
    await db.insert(clientMessages).values({
      email,
      fromClient: true,
      body: d.body,
      attachments: JSON.stringify(d.attachments),
    });
  } catch (err) {
    console.error("[cont/mesaje] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Nu am putut salva mesajul. Încearcă din nou." },
      { status: 500 },
    );
  }

  // Notificarea catre noi nu blocheaza raspunsul — mesajul e deja in admin.
  sendEmail({
    to: ADMIN_EMAIL,
    replyTo: email,
    subject: `💬 Mesaj nou din cont — ${email}`,
    html: wrapEmail(
      "Mesaj nou de la un client",
      `
      <p><strong>${escapeHtml(email)}</strong> a scris din contul lui:</p>
      <div style="white-space:pre-wrap;border-left:3px solid #e5e5e5;padding-left:16px;margin:16px 0;color:#334155;">${escapeHtml(d.body)}</div>
      ${
        d.attachments.length
          ? `<p><strong>Fișiere atașate (${d.attachments.length}):</strong></p><ul>${d.attachments
              .map((a) => `<li><a href="${escapeHtml(a.url)}">${escapeHtml(a.name)}</a></li>`)
              .join("")}</ul>`
          : ""
      }
      <p style="margin-top:16px;"><a href="${SITE.url}/admin/mesaje">Răspunde din admin →</a></p>
      `,
    ),
  }).catch((e) => console.error("[cont/mesaje] mail admin:", e));

  return NextResponse.json({ ok: true });
}
