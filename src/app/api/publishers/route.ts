import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { publishers } from "@/db/schema";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { OPTIUNI_PE_TIP, etichetaOptiune } from "@/lib/optiuni-partener";
import { TERMENI_VERSIUNE } from "@/lib/termene-parteneri";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { eq } from "drizzle-orm";
import { verificaAutoritate } from "@/lib/autoritate";
import { SITE } from "@/data/site";

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
  // 29.09.2026 — obligatoriu: bifa e acceptarea acordului (/termeni-parteneri).
  declarationAccepted: z.literal(true, { errorMap: () => ({ message: "Trebuie să accepți acordul de colaborare." }) }),
  contactName: z.string().min(2).max(150),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(40).optional().or(z.literal("")),
  payoutIban: z.string().max(50).optional().or(z.literal("")),
  niche: z.string().max(60).optional().or(z.literal("")),
  extraOptions: z
    .array(z.object({ key: z.enum(["facebook", "prima_pagina", "story", "link_bio"]), pret: z.number().int().min(1).max(10000) }))
    .max(5)
    .optional(),
  payoutCompany: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  gdprConsent: z.literal(true),
  // 29.09.2026 — influenceri: canal YouTube, cont Instagram / TikTok / Facebook.
  kind: z.enum(["presa", "influencer"]).optional(),
  platform: z.enum(["youtube", "instagram", "tiktok", "facebook"]).optional(),
  followers: z.number().int().nonnegative().optional(),
  avgViews: z.number().int().nonnegative().optional(),
  /** Influencerul isi spune pretul pe postare; adminul il poate schimba la aprobare. */
  pretCerut: z.number().int().min(1).max(50000).optional(),
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
  const influencer = d.kind === "influencer";
  if (influencer && (!d.platform || !d.followers || !d.pretCerut)) {
    return NextResponse.json(
      { ok: false, error: "Completează platforma, numărul de urmăritori și prețul pe postare." },
      { status: 400 },
    );
  }
  // Optiunile se primesc doar pe tipul lor (Facebook la presa, story la influencer).
  const optiuni = (d.extraOptions || []).filter((o) =>
    (OPTIUNI_PE_TIP[influencer ? "influencer" : "presa"] as string[]).includes(o.key),
  );

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
    niche: d.niche || null,
    extraOptions: optiuni.length ? JSON.stringify(optiuni) : null,
    kind: influencer ? "influencer" : "presa",
    platform: influencer ? d.platform : null,
    followers: influencer ? d.followers ?? null : null,
    avgViews: influencer ? d.avgViews ?? null : null,
    // La presa tariful vine din nivel (admin); la influencer, din ce cere el.
    pricePerArticle: influencer ? d.pretCerut ?? null : null,
    // Acordul de colaborare (/termeni-parteneri): ce versiune, cand, de unde.
    ...(d.declarationAccepted
      ? { termsVersion: TERMENI_VERSIUNE, termsAcceptedAt: new Date(), termsIp: ip.slice(0, 60) }
      : {}),
    payoutCompany: d.payoutCompany || null,
    notes: d.notes || null,
    status: "pending",
  });

  // 29.09.2026 — autoritatea o citim noi, din Moz (lib/autoritate.ts), cat
  // timp omul inca asteapta raspunsul formularului. Daca Moz nu raspunde,
  // inscrierea merge mai departe: scorul se poate reverifica din admin.
  // Scorul de domeniu n-are sens pentru un canal de YouTube.
  const aut = influencer ? null : await verificaAutoritate(d.siteUrl).catch(() => null);
  if (aut) {
    await db
      .update(publishers)
      .set({ ...aut, authorityCheckedAt: new Date() })
      .where(eq(publishers.id, id))
      .catch((e) => console.error("[publishers] autoritate:", e));
  }

  const html = wrapEmail(
    influencer ? "Aplicație influencer — MediaExpres" : "Aplicație ziar nou — MediaExpres",
    `
    <p>${influencer ? "Un influencer vrea să intre în catalog." : "Un ziar dorește să intre în rețeaua MediaExpres."}</p>
    <table style="width:100%;border-collapse:collapse;">
      ${influencer ? kv("Influencer", `${esc(d.platform || "")} · ${(d.followers || 0).toLocaleString("ro-RO")} urmăritori · ${d.avgViews ? d.avgViews.toLocaleString("ro-RO") + " vizualizări medii" : "vizualizări nedeclarate"} · cere ${d.pretCerut} lei / postare`) : ""}
      ${kv("Site", d.siteName)}
      ${kv("URL", d.siteUrl)}
      ${kv("Judet / Regiune", `${d.county || "—"} / ${d.region || "—"}`)}
      ${kv("Facebook", d.facebookUrl || "—")}
      ${kv("Autoritate (verificată de noi)", aut ? `DA ${aut.domainAuthority ?? "—"} · PA ${aut.pageAuthority ?? "—"} · spam ${aut.spamScore ?? "—"}%${aut.openPageRank != null ? ` · OPR ${aut.openPageRank}/10` : ""}` : "neverificată (lipsește cheia Moz sau Moz nu a răspuns)")}
      ${kv("Nișă", d.niche || "—")}
      ${kv("Opțiuni oferite", optiuni.length ? optiuni.map((o) => `${esc(etichetaOptiune(o.key))}: ${o.pret} lei`).join(", ") : "—")}
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
    <p style="margin-top:16px;"><a href="${SITE.url}/admin/parteneri/${id}">Deschide în admin →</a></p>
  `
  );

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `${influencer ? "[Influencer nou]" : "[Ziar nou]"} ${d.siteName}`,
    html,
    replyTo: d.contactEmail,
  });

  return NextResponse.json({ ok: true, id });
}
