import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOrderToken } from "@/lib/order-token";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { findPackageById } from "@/data/packages";
import { db } from "@/db";
import { orderSubmissions } from "@/db/schema";
import { SITE } from "@/data/site";
import { CONTENT_DECLARATION_ERROR } from "@/lib/content-policy";

export const runtime = "nodejs";

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
  uniquePerSite: z.boolean().default(true),
  // Bifa obligatorie, nu optionala cu default: intrebarea are rost doar daca
  // raspunsul e explicit. z.literal(true) refuza si `false`, si lipsa campului.
  contentDeclaration: z.literal(true, {
    errorMap: () => ({ message: CONTENT_DECLARATION_ERROR }),
  }),
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

  // SALVAREA E PRIMA, inainte de orice email. Un articol platit care a trait
  // doar intr-un email catre o adresa cu bounce a fost de negasit in admin —
  // nu se mai intampla. Daca DB-ul pica, mergem totusi mai departe pe email
  // (best-effort dublu), dar niciodata invers.
  // O plata = o singura trimitere. Insertul e si garda: indexul unic pe
  // stripeSessionId respinge a doua trimitere pe aceeasi comanda.
  let alreadySubmitted = false;
  try {
    const inserted = await db
      .insert(orderSubmissions)
      .values({
        stripeSessionId: order.sessionId,
        email: order.email,
        packageId: order.packageId,
        title: d.title,
        body: d.body,
        metaDescription: d.metaDescription || null,
        keywords: d.keywords?.length ? d.keywords.join(", ") : null,
        companyName: d.companyName || null,
        siteUrl: d.siteUrl || null,
        contactPhone: d.contactPhone || null,
        images: JSON.stringify(d.images),
        featuredIndex: d.featuredIndex,
        facebookOptIn: d.facebookOptIn,
        uniquePerSite: d.uniquePerSite,
        generatedByAi: d.generatedByAi,
        isCasino,
      })
      .onConflictDoNothing({ target: orderSubmissions.stripeSessionId })
      .returning({ id: orderSubmissions.id });
    alreadySubmitted = inserted.length === 0;
  } catch (err) {
    console.error("[articol/submit] NU am putut salva in DB (continui pe email):", err);
  }

  if (alreadySubmitted) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Ai trimis deja materialele pentru această comandă. Dacă vrei să le modifici, răspunde la emailul de confirmare sau scrie-ne pe WhatsApp la " +
          SITE.phone +
          ".",
      },
      { status: 409 },
    );
  }

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
      ${kv("Publicare", d.uniquePerSite ? "Variantă unică pe fiecare ziar" : "⚠️ IDENTIC pe toate — clientul a cerut textul neschimbat")}
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
    subject: "Materialele au ajuns — publicăm în 24 de ore lucrătoare",
    html: wrapEmail(
      "Am primit articolul tău",
      `
      <p>Salut,</p>
      <p>Am primit articolul <strong>„${esc(d.title)}"</strong>${
        d.images.length
          ? ` și ${d.images.length === 1 ? "imaginea atașată" : `cele ${d.images.length} imagini`}`
          : ""
      }.</p>
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
