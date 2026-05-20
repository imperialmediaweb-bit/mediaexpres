import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";
import { sendCapiEvent, extractRequestUserData, splitName } from "@/lib/meta-capi";
import { signFbLeadToken } from "@/lib/fb-lead-token";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mediaexpress.ro";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().min(9).max(40),
  website: z.string().max(200).optional(),
  eventId: z.string().min(8).max(64).optional(),
});

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const log = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (log.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  log.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (limited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Prea multe cereri. Încearcă din nou în câteva minute." },
      { status: 429 },
    );
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
  const data = parsed.data;

  if (data.website) return NextResponse.json({ ok: true });

  // Salveaza lead-ul ca user in DB (find-or-create).
  // CRITIC: dacă DB pică, semnalăm clar în email admin (subject + banner roșu).
  let dbSaved = false;
  let dbError: string | null = null;
  try {
    const existing = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values({
        email: data.email,
        name: data.name,
        phone: data.phone,
      });
    }
    dbSaved = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
    console.error("[oferta-fb] db error:", err);
  }

  const token = signFbLeadToken({ name: data.name, email: data.email, phone: data.phone });
  const offerUrl = `${SITE_URL}/oferta/${token}`;
  const firstName = data.name.trim().split(/\s+/)[0];

  const adminHtml = wrapEmail(
    dbSaved ? "Lead nou — Campanie Facebook" : "⚠️ LEAD NOU — DB FAILED (recuperează manual)",
    `
    ${!dbSaved ? `<div style="background:#fee2e2;border:2px solid #dc2626;padding:12px;border-radius:8px;margin-bottom:16px;color:#991b1b;"><strong>⚠️ ATENȚIE:</strong> salvarea în baza de date a eșuat. Lead-ul nu apare în /admin/clienti. Importă-l manual din /admin/clienti → Import lead-uri Facebook. Eroare: ${dbError || "necunoscută"}</div>` : ""}
    <p style="margin:0 0 12px;color:#64748b;">Lead venit din landing page-ul dedicat campaniilor Facebook.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${kv("Nume", data.name)}
      ${kv("Email", data.email)}
      ${kv("Telefon", data.phone)}
      ${kv("Sursă", "Facebook Ads — /oferta-fb")}
      ${kv("IP", ip)}
      ${kv("Salvat în DB", dbSaved ? "✅ Da" : "❌ NU — recuperează manual")}
    </table>
    <p style="margin:16px 0 0;"><a href="${offerUrl}" style="color:#C8102E;">Link ofertă personalizată (trimis automat pe email)</a></p>
  `,
  );

  const adminResult = await sendEmail({
    to: ADMIN_EMAIL,
    subject: dbSaved
      ? `🔥 [FB Lead] ${data.name} — ${data.phone}`
      : `⚠️ [FB Lead DB FAIL] ${data.name} — ${data.phone}`,
    html: adminHtml,
    replyTo: data.email,
  });

  await sendEmail({
    to: data.email,
    subject: "Oferta ta personalizată — MediaExpres",
    html: wrapEmail(
      "Oferta ta personalizată — MediaExpres",
      `
      <p>Salut ${firstName},</p>
      <p>Am pregătit pentru tine <strong>oferta personalizată</strong> cu toate detaliile — pachete, prețuri și lista completă a rețelei noastre de 50 de ziare.</p>
      <p style="margin:24px 0;text-align:center;">
        <a href="${offerUrl}" style="display:inline-block;background:#C8102E;color:white;padding:14px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px;">
          Vezi oferta mea →
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;">Linkul este valabil 90 de zile. Pe pagina ofertei poți trimite materialele direct sau ne lași o întrebare.</p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `,
    ),
  });

  if (!adminResult.ok) {
    return NextResponse.json(
      { ok: false, error: "Eroare la trimiterea emailului" },
      { status: 500 },
    );
  }

  const { firstName: fn, lastName } = splitName(data.name);
  sendCapiEvent({
    eventName: "Lead",
    eventId: data.eventId,
    eventSourceUrl: req.headers.get("referer") || undefined,
    user: { email: data.email, phone: data.phone, firstName: fn, lastName, ...extractRequestUserData(req) },
    customData: { content_name: "Oferta FB Landing", content_category: "facebook-ad", lead_source: "facebook" },
  }).catch((err) => console.error("[oferta-fb] capi error:", err));

  return NextResponse.json({ ok: true });
}
