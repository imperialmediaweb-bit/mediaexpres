import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requestListSchema } from "@/lib/validators";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";
import { buildListEmail, LIST_EMAIL_SUBJECT } from "@/lib/list-email";

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

  // Salveaza lead-ul ca user in DB (find-or-create). Nu blocam request-ul daca pica DB-ul.
  try {
    const existing = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values({
        email: data.email,
        name: data.name,
        phone: data.phone || null,
        companyName: data.company || null,
      });
    }
  } catch (err) {
    console.error("[request-list] db error:", err);
  }

  const firstName = data.name.split(" ")[0];

  // 1) Email initial: LISTA COMPLETA, direct in email, din sablonul unic
  // (lib/list-email.ts). Nu promitem apeluri — nu suna nimeni pe nimeni.
  await sendEmail({
    to: data.email,
    subject: LIST_EMAIL_SUBJECT,
    html: buildListEmail(firstName),
    replyTo: ADMIN_EMAIL,
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
    <p style="margin-top:20px;color:#64748b;">Lead-ul a primit AUTOMAT lista completă cu cele 50 de ziare + linkul spre oferta de 500 lei, și a fost dus direct la listă pe site. Follow-up automat în ziua 3 și ziua 7. Nu trebuie să faci nimic — intervii doar dacă răspunde.</p>
    <p style="margin-top:16px;">
      <a href="${SITE.url}/admin/emailuri?q=${encodeURIComponent(data.email)}" style="display:inline-block;background:#c1121f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Vezi conversația cu el →</a>
    </p>
    <p style="margin-top:12px;font-size:13px;color:#64748b;">Vrei să-i scrii personal? Răspunde direct la acest email — ajunge la ${esc(data.email)}.</p>
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
      <p>Acum câteva zile ai cerut lista rețelei MediaExpres. Dacă vrei să o testezi fără risc, pachetul <strong>Local (150 RON)</strong> publică articolul tău într-un ziar județean la alegere — linkul îl primești în 4h.</p>
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
