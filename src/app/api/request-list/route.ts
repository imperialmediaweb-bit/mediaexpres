import { NextRequest, NextResponse } from "next/server";
import { requestListSchema } from "@/lib/validators";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";
import { REGION_COUNTS } from "@/data/newspapers";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

const DAY_MS = 86_400_000;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = requestListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 }
    );
  }
  const data = parsed.data;
  if (data.website) return NextResponse.json({ ok: true });

  const firstName = data.name.split(" ")[0];

  // 1) Email initial: lista rezumat + mentiune PDF
  const customerHtml = wrapEmail(
    "Lista completă a celor 50 ziare partenere",
    `
    <p>Salut ${firstName},</p>
    <p>Îiți mulțumim pentru interesul pentru serviciile MediaExpres! Mai jos ai rezumatul rețelei noastre:</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      ${kv("Ziare naționale", `${REGION_COUNTS.Național} ziare`)}
      ${kv("Moldova", `${REGION_COUNTS.Moldova} ziare locale`)}
      ${kv("Transilvania", `${REGION_COUNTS.Transilvania} ziare locale`)}
      ${kv("Muntenia + București", `${REGION_COUNTS.Muntenia} ziare locale`)}
      ${kv("Banat + Oltenia", `${REGION_COUNTS.Banat} ziare locale`)}
      ${kv("Distribuție Facebook", "37 pagini asociate")}
    </table>
    <p>Lista detaliată cu toate numele și domeniile celor 50 ziare partenere este disponibilă ca document PDF. <strong>Pentru a proteja rețeaua noastră</strong>, trimitem documentul direct pe email după o scurtă convorbire — un membru al echipei te va contacta în maximum 24h.</p>
    <p>Dacă dorești să avansăm mai rapid, poți răspunde direct la acest email cu o scurtă descriere a proiectului.</p>
    <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
  `
  );

  await sendEmail({
    to: data.email,
    subject: "Rețeaua MediaExpres — detalii pentru tine",
    html: customerHtml,
  });

  // 2) Notificare admin — lead nou
  const adminHtml = wrapEmail(
    "Lead nou: cerere listă ziare",
    `
    <table style="width:100%;border-collapse:collapse;">
      ${kv("Nume", data.name)}
      ${kv("Email", data.email)}
      ${kv("Telefon", data.phone || "—")}
      ${kv("Companie", data.company || "—")}
    </table>
    <p style="margin-top:20px;color:#64748b;">Contactează lead-ul în 24h pentru a trimite lista detaliată și a iniția vânzarea.</p>
  `
  );
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[Lead] Cerere listă ziare — ${data.name}`,
    html: adminHtml,
    replyTo: data.email,
  });

  // 3) Drip follow-up: ziua 3 — soft nudge cu pachet entry-level
  const day3 = new Date(Date.now() + 3 * DAY_MS).toISOString();
  await sendEmail({
    to: data.email,
    subject: "Testează rețeaua cu un articol mic",
    scheduledAt: day3,
    replyTo: ADMIN_EMAIL,
    html: wrapEmail(
      "Testează rețeaua cu un articol mic",
      `
      <p>Salut ${firstName},</p>
      <p>Acum câteva zile ai cerut lista rețelei MediaExpres. Dacă vrei să o testezi fără risc, pachetul <strong>Local (150 RON)</strong> publică articolul tău într-un ziar județean la alegere — linkul îl primești în 24h.</p>
      <p style="margin:24px 0;"><a href="${SITE.url}/pachete#standard" style="display:inline-block;background:#c1121f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Vezi pachetul Local</a></p>
      <p>Dacă vrei altă acoperire (10 ziare / 50 ziare / abonament), răspunde direct la acest email și îți fac recomandarea potrivită.</p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `
    ),
  });

  // 4) Drip follow-up: ziua 7 — last call cu reducere
  const day7 = new Date(Date.now() + 7 * DAY_MS).toISOString();
  await sendEmail({
    to: data.email,
    subject: "Ultimă chemare — reducere la primul articol",
    scheduledAt: day7,
    replyTo: ADMIN_EMAIL,
    html: wrapEmail(
      "Reducere la primul articol — ofertă limitată",
      `
      <p>Salut ${firstName},</p>
      <p>Vreau să-ți fac oferta corectă pentru primul articol. Dacă alegi să publici cu noi în următoarele 48h, îți aplic automat <strong>o reducere</strong> la pachetul ales.</p>
      <p>Răspunde la acest email cu <strong>„da”</strong> și îți confirm reducerea pe loc.</p>
      <p style="margin:24px 0;"><a href="${SITE.url}/pachete" style="display:inline-block;background:#c1121f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Vezi toate pachetele</a></p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `
    ),
  });

  return NextResponse.json({ ok: true });
}
