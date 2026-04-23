import { NextRequest, NextResponse } from "next/server";
import { requestListSchema } from "@/lib/validators";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";
import { REGION_COUNTS } from "@/data/newspapers";

export const runtime = "nodejs";

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

  // Email the customer with the list (in-body preview + mention of PDF)
  const customerHtml = wrapEmail(
    "Lista completă a celor 50 ziare partenere",
    `
    <p>Salut ${data.name.split(" ")[0]},</p>
    <p>Îți mulțumim pentru interesul pentru serviciile MediaExpres! Mai jos ai rezumatul rețelei noastre:</p>
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

  // Notify admin
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

  return NextResponse.json({ ok: true });
}
