import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";
import { sendCapiEvent, extractRequestUserData, splitName } from "@/lib/meta-capi";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().min(9).max(40),
  website: z.string().max(200).optional(), // honeypot
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

  const html = wrapEmail(
    "Lead nou — Campanie Facebook (oferta-fb)",
    `
    <p style="margin:0 0 12px;color:#64748b;">Lead venit din landing page-ul dedicat campaniilor Facebook.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${kv("Nume", data.name)}
      ${kv("Email", data.email)}
      ${kv("Telefon", data.phone)}
      ${kv("Sursă", "Facebook Ads — /oferta-fb")}
      ${kv("IP", ip)}
    </table>
    <p style="margin:16px 0 0;color:#0B2545;font-weight:600;">⏱️ Sună-l în max. 30 min pentru rată maximă de conversie.</p>
  `,
  );

  const adminResult = await sendEmail({
    to: ADMIN_EMAIL,
    subject: `🔥 [FB Lead] ${data.name} — ${data.phone}`,
    html,
    replyTo: data.email,
  });

  const customerHtml = wrapEmail(
    "Am primit cererea ta — te sunăm în 30 min",
    `
    <p>Salut ${data.name.split(" ")[0]},</p>
    <p>Mulțumim pentru interes! Un consultant MediaExpres te va contacta în
    <strong>maxim 30 de minute</strong> (în timpul programului 9-18) cu oferta personalizată
    pentru tipul tău de articol.</p>
    <p style="margin:16px 0;padding:14px;background:#F8F5F0;border-left:3px solid #C8102E;border-radius:4px;">
      <strong style="color:#0B2545;">Până atunci, iată ce poți face:</strong><br/>
      • Vezi pachetele și prețurile → <a href="https://mediaexpress.ro/pachete" style="color:#C8102E;">mediaexpress.ro/pachete</a><br/>
      • Studii de caz → <a href="https://mediaexpress.ro/blog" style="color:#C8102E;">mediaexpress.ro/blog</a>
    </p>
    <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
  `,
  );

  await sendEmail({
    to: data.email,
    subject: "Cererea ta a fost primită — te sunăm în 30 min",
    html: customerHtml,
  });

  if (!adminResult.ok) {
    return NextResponse.json(
      { ok: false, error: "Eroare la trimiterea emailului" },
      { status: 500 },
    );
  }

  // CAPI Lead cu acelasi event_id ca Pixel-ul browser -> dedup automat Meta.
  const { firstName, lastName } = splitName(data.name);
  const reqUser = extractRequestUserData(req);
  sendCapiEvent({
    eventName: "Lead",
    eventId: data.eventId,
    eventSourceUrl: req.headers.get("referer") || undefined,
    user: {
      email: data.email,
      phone: data.phone,
      firstName,
      lastName,
      ...reqUser,
    },
    customData: {
      content_name: "Oferta FB Landing",
      content_category: "facebook-ad",
      lead_source: "facebook",
    },
  }).catch((err) => console.error("[oferta-fb] capi error:", err));

  return NextResponse.json({ ok: true });
}
