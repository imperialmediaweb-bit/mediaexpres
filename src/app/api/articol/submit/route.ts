import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOrderToken } from "@/lib/order-token";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";
import { findPackageById } from "@/data/packages";

export const runtime = "nodejs";

// Tot ce vine de la client si ajunge in HTML de email trece prin asta —
// altfel un titlu cu markup devine HTML viu in inboxul adminului.
function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const imageSchema = z.object({
  url: z.string().url().max(500),
  publicId: z.string().max(300).optional(),
});

const schema = z.object({
  token: z.string().min(10),
  title: z.string().min(5).max(300),
  body: z.string().min(100).max(30000),
  companyName: z.string().max(200).optional(),
  siteUrl: z.string().max(300).optional(),
  contactPhone: z.string().max(40).optional(),
  metaDescription: z.string().max(400).optional(),
  keywords: z.array(z.string().max(80)).max(20).optional(),
  images: z.array(imageSchema).max(3).default([]),
  featuredIndex: z.number().int().min(0).max(2).default(0),
  facebookOptIn: z.boolean().default(true),
  generatedByAi: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
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
  const d = parsed.data;

  const order = verifyOrderToken(d.token);
  if (!order) {
    return NextResponse.json(
      { ok: false, error: "Link expirat sau invalid. Scrie-ne pe contact@mediaexpress.ro." },
      { status: 403 },
    );
  }

  const pkg = findPackageById(order.packageId);
  const isCasino = order.packageId.includes("cazino");

  // featuredIndex vine din UI, dar poate depasi numarul real de poze.
  const featured = d.images[d.featuredIndex] ?? d.images[0];

  const imagesHtml = d.images.length
    ? d.images
        .map(
          (img, i) =>
            `<p style="margin:4px 0;"><a href="${esc(img.url)}">${esc(img.url)}</a>${
              i === d.featuredIndex ? ' <strong style="color:#C8102E;">← REPREZENTATIVĂ</strong>' : ""
            }</p>`,
        )
        .join("")
    : '<p style="color:#94a3b8;">Nicio poză încărcată.</p>';

  const adminHtml = wrapEmail(
    isCasino ? "⚠️ Articol nou — CAZINO" : "Articol nou de publicat",
    `
    <p style="margin:0 0 12px;color:#64748b;">Client care a plătit deja. Materialele sunt gata de publicare.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${kv("Pachet", pkg ? `${pkg.name} — ${pkg.price} RON` : order.packageId)}
      ${kv("Categorie", isCasino ? "⚠️ CAZINO / iGaming" : "Standard")}
      ${kv("Email client", order.email)}
      ${kv("Telefon", d.contactPhone || "—")}
      ${kv("Firmă", d.companyName || "—")}
      ${kv("Site", d.siteUrl || "—")}
      ${kv("Distribuire Facebook", d.facebookOptIn ? "✅ Da" : "❌ Nu (clientul a refuzat)")}
      ${kv("Scris cu AI", d.generatedByAi ? "Da" : "Nu — text propriu")}
      ${kv("Stripe session", order.sessionId)}
    </table>

    <h3 style="margin:24px 0 8px;font-family:Georgia,serif;color:#0B1F3A;">${esc(d.title)}</h3>
    ${d.metaDescription ? `<p style="color:#64748b;font-size:13px;"><strong>Meta:</strong> ${esc(d.metaDescription)}</p>` : ""}
    ${d.keywords?.length ? `<p style="color:#64748b;font-size:13px;"><strong>Cuvinte-cheie:</strong> ${esc(d.keywords.join(", "))}</p>` : ""}
    <div style="white-space:pre-wrap;border-left:3px solid #e2e8f0;padding-left:16px;margin:16px 0;color:#334155;">${esc(d.body)}</div>

    <h4 style="margin:24px 0 8px;color:#0B1F3A;">Imagini (${d.images.length}/3)</h4>
    ${imagesHtml}
    `,
  );

  const adminResult = await sendEmail({
    to: ADMIN_EMAIL,
    subject: isCasino
      ? `⚠️ [CAZINO] Articol de publicat — ${d.companyName || order.email}`
      : `📄 Articol de publicat — ${d.companyName || order.email}`,
    html: adminHtml,
    replyTo: order.email,
  });

  if (!adminResult.ok) {
    return NextResponse.json(
      { ok: false, error: "Nu am putut trimite materialele. Încearcă din nou." },
      { status: 500 },
    );
  }

  // Confirmarea catre client nu trebuie sa blocheze raspunsul — materialele au ajuns deja.
  sendEmail({
    to: order.email,
    subject: "Materialele au ajuns — publicăm în 24h",
    html: wrapEmail(
      "Am primit articolul tău",
      `
      <p>Salut,</p>
      <p>Am primit articolul <strong>„${esc(d.title)}"</strong> și cele ${d.images.length} imagini.</p>
      <p>Îl publicăm ${
        pkg?.newspapers
          ? pkg.newspapers === 1
            ? "pe publicația din pachetul tău"
            : `pe cele ${pkg.newspapers}${pkg.newspapers >= 20 ? " de" : ""} publicații din pachetul tău`
          : "în publicațiile din pachetul tău"
      } în maximum <strong>24 de ore lucrătoare</strong>. Când e gata, primești pe email raportul cu toate linkurile.</p>
      ${featured ? `<p style="margin:16px 0;"><img src="${esc(featured.url)}" alt="" style="max-width:100%;border-radius:8px;" /></p>` : ""}
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `,
    ),
  }).catch((err) => console.error("[articol/submit] client email error:", err));

  return NextResponse.json({ ok: true });
}
