import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { contactSchema } from "@/lib/validators";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";
import { sendCapiEvent, extractRequestUserData, splitName } from "@/lib/meta-capi";

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

  // Salveaza contactul ca user in DB (find-or-create). Nu blocam request-ul daca pica DB-ul.
  try {
    const existing = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values({
        email: data.email,
        name: data.name,
      });
    }
  } catch (err) {
    console.error("[contact] db error:", err);
  }

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

  // Meta CAPI: Lead event server-side, hashuit (PII-safe).
  // Daca si front-end-ul trimite fbq('track','Lead', ..., {eventID:X}) cu acelasi
  // event_id, Meta deduplicheaza automat. In lipsa, asta e oricum valid (Lead unic).
  const { firstName, lastName } = splitName(data.name);
  const reqUser = extractRequestUserData(req);
  sendCapiEvent({
    eventName: "Lead",
    eventSourceUrl: req.headers.get("referer") || undefined,
    user: {
      email: data.email,
      firstName,
      lastName,
      ...reqUser,
    },
    customData: { content_name: "Contact Form", content_category: "contact" },
  }).catch((err) => console.error("[contact] capi error:", err));

  return NextResponse.json({ ok: true });
}
