import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { publishers } from "@/db/schema";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";
import { ensureOrderColumns } from "@/lib/ensure-columns";

export const runtime = "nodejs";

const applySchema = z.object({
  siteName: z.string().min(2).max(150),
  siteUrl: z.string().url(),
  county: z.string().max(60).optional().or(z.literal("")),
  region: z.string().max(60).optional().or(z.literal("")),
  facebookUrl: z.string().url().optional().or(z.literal("")),
  monthlyTraffic: z.number().int().nonnegative().optional(),
  articlesPerMonth: z.number().int().nonnegative().optional(),
  // 14.09.2026 — cifra declarata singura nu valoreaza nimic: oricine scrie
  // 200.000. Se cere captura din Google Analytics, iar bifa de declaratie
  // face din cifre o afirmatie asumata, nu o parere.
  analyticsProofUrl: z.string().url().max(500).optional().or(z.literal("")),
  facebookFollowers: z.number().int().nonnegative().optional(),
  /** Intrebarea care desparte plasarea de SEO de cea de vizibilitate. */
  dofollowLinks: z.boolean().optional(),
  declarationAccepted: z.boolean().optional(),
  contactName: z.string().min(2).max(150),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(40).optional().or(z.literal("")),
  payoutIban: z.string().max(50).optional().or(z.literal("")),
  payoutCompany: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  gdprConsent: z.literal(true),
});

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Prea multe aplicații. Incearcă peste câteva minute." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const id = crypto.randomUUID();
  // Coloanele noi (dovada, dofollow, declaratie) pot lipsi pana la fix-db.
  await ensureOrderColumns();
  await db.insert(publishers).values({
    id,
    siteName: d.siteName,
    siteUrl: d.siteUrl,
    county: d.county || null,
    region: d.region || null,
    facebookUrl: d.facebookUrl || null,
    monthlyTraffic: d.monthlyTraffic ?? null,
    articlesPerMonth: d.articlesPerMonth ?? null,
    analyticsProofUrl: d.analyticsProofUrl || null,
    facebookFollowers: d.facebookFollowers ?? null,
    dofollowLinks: d.dofollowLinks ?? null,
    declarationAccepted: d.declarationAccepted === true,
    contactName: d.contactName,
    contactEmail: d.contactEmail,
    contactPhone: d.contactPhone || null,
    payoutIban: d.payoutIban || null,
    payoutCompany: d.payoutCompany || null,
    notes: d.notes || null,
    status: "pending",
  });

  const html = wrapEmail(
    "Aplicație ziar nou — MediaExpres",
    `
    <p>Un ziar dorește să intre în rețeaua MediaExpres.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${kv("Site", d.siteName)}
      ${kv("URL", d.siteUrl)}
      ${kv("Judet / Regiune", `${d.county || "—"} / ${d.region || "—"}`)}
      ${kv("Facebook", d.facebookUrl || "—")}
      ${kv("Trafic lunar", d.monthlyTraffic ? `${d.monthlyTraffic.toLocaleString()} vizite` : "—")}
      ${kv("Dovada traficului", d.analyticsProofUrl ? `<a href="${d.analyticsProofUrl}">captura din Analytics</a>` : "⚠️ NU a urcat captura")}
      ${kv("Urmaritori Facebook", d.facebookFollowers ? d.facebookFollowers.toLocaleString() : "—")}
      ${kv("Linkuri dofollow", d.dofollowLinks === true ? "✅ Da" : d.dofollowLinks === false ? "❌ Nu (doar vizibilitate, nu SEO)" : "— nu a raspuns")}
      ${kv("Declaratie asumata", d.declarationAccepted ? "✅ Da" : "⚠️ Nu")}
      ${kv("Articole / luna", d.articlesPerMonth ? String(d.articlesPerMonth) : "—")}
      ${kv("Contact", `${d.contactName} — ${d.contactEmail}${d.contactPhone ? " — " + d.contactPhone : ""}`)}
      ${kv("IBAN plata", d.payoutIban || "—")}
      ${kv("Companie plata", d.payoutCompany || "—")}
    </table>
    ${d.notes ? `<p style="margin-top:12px;"><strong>Observatii:</strong><br/>${d.notes.replace(/</g, "&lt;")}</p>` : ""}
    <p style="margin-top:16px;"><a href="/admin/parteneri">Deschide in admin →</a></p>
  `
  );

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[Ziar nou] ${d.siteName}`,
    html,
    replyTo: d.contactEmail,
  });

  return NextResponse.json({ ok: true, id });
}
