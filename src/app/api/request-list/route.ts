import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requestListSchema } from "@/lib/validators";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";
import { buildListEmail, LIST_EMAIL_SUBJECT } from "@/lib/list-email";
import { promoDeadlineLabel } from "@/data/packages";

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

  // Termenul curent al ofertei — null dupa expirarea finala, caz in care
  // follow-upurile nu mai promit o data care nu exista.
  const deadlineLabel = promoDeadlineLabel();
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

  // 3) Follow-up ziua 3 — apasa pe ACEEASI oferta ca reclama si ca site-ul.
  // Inainte trimitea omul spre pachetul Local, 150 lei, un singur ziar: ii
  // aratam lista cu 50 de ziare si apoi il impingeam spre cel mai mic pachet.
  const day3 = new Date(Date.now() + 3 * DAY_MS).toISOString();
  await sendEmail({
    to: data.email,
    subject: "Toate cele 50 de ziare, pentru 500 de lei",
    scheduledAt: day3,
    replyTo: ADMIN_EMAIL,
    html: wrapEmail(
      "Toate cele 50 de ziare, pentru 500 de lei",
      `
      <p>Salut ${firstName},</p>
      <p>Acum câteva zile ai cerut lista rețelei MediaExpres. Îți scriu pentru un singur lucru: <strong>oferta de intrare${deadlineLabel ? `, valabilă până pe ${deadlineLabel}` : ""}</strong>.</p>
      <p>Un articol publicat pe <strong>toate cele 50 de ziare</strong> — 41 locale + 9 naționale — pentru <strong>500 de lei</strong> în loc de 1.500. Nu un ziar, nu zece. Toate.</p>
      <ul style="margin:16px 0;padding-left:20px;line-height:1.7;">
        <li><strong>Articol unic pe fiecare ziar</strong> — nu același text copiat de 50 de ori</li>
        <li>50 de backlinks dofollow permanente, din 50 de domenii .ro diferite</li>
        <li>Publicare în maximum 4 ore lucrătoare</li>
        <li>Raport cu toate linkurile + factură fiscală</li>
      </ul>
      <p>Dacă nu ai articol scris, îl redactăm noi — ai nevoie doar de site-ul firmei și două propoziții.</p>
      <p style="margin:24px 0;text-align:center;"><a href="${SITE.url}/oferta-500" style="display:inline-block;background:#c1121f;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Vezi oferta de 500 lei</a></p>
      <p>Ai o întrebare înainte să comanzi? Răspunde la acest email sau scrie-ne pe WhatsApp la <strong>${SITE.phone}</strong>.</p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `
    ),
  });

  // 4) Follow-up ziua 7 — urgenta REALA (termenul ofertei), nu o reducere
  // inventata pe care trebuia sa o confirmi manual la fiecare raspuns.
  const day7 = new Date(Date.now() + 7 * DAY_MS).toISOString();
  await sendEmail({
    to: data.email,
    subject: deadlineLabel
      ? `Oferta de 500 lei expiră pe ${deadlineLabel}`
      : "Oferta de 500 lei — ultima chemare",
    scheduledAt: day7,
    replyTo: ADMIN_EMAIL,
    html: wrapEmail(
      deadlineLabel ? `Expiră pe ${deadlineLabel}` : "Ultima chemare",
      `
      <p>Salut ${firstName},</p>
      <p>Ultimul mesaj pe tema asta${deadlineLabel ? `: oferta de intrare expiră pe <strong>${deadlineLabel}</strong>` : ""}.</p>
      <p><strong>500 de lei</strong> pentru un articol pe toate cele 50 de ziare, în loc de 1.500. După expirare, același lucru costă prețul întreg.</p>
      <p>Dacă ai ezitat pentru că nu ai text scris — îl scriem noi, fără cost suplimentar. Dacă ai ezitat din alt motiv, răspunde-mi cu el; poate am o soluție.</p>
      <p style="margin:24px 0;text-align:center;"><a href="${SITE.url}/oferta-500" style="display:inline-block;background:#c1121f;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Comandă acum — 500 lei</a></p>
      <p style="font-size:14px;color:#64748b;">Preferi transfer bancar? Ai datele și formularul aici: <a href="${SITE.url}/comanda/transfer?pachet=promo-50" style="color:#c1121f;">${SITE.domain}/comanda/transfer</a></p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `
    ),
  });

  return NextResponse.json({ ok: true });
}
