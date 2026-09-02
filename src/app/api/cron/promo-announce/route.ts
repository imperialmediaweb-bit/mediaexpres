import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, promoAnnouncements } from "@/db/schema";
import { sendEmail, wrapEmail, defaultListUnsubscribe } from "@/lib/email";
import { promoDeadlineLabel, currentPromoDeadline, PROMO_ROLLING } from "@/data/packages";
import { SITE } from "@/data/site";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Anuntarea automata a prelungirii ofertei promo.
 *
 * Se apeleaza zilnic dintr-un cron extern (acelasi serviciu care ruleaza deja
 * campaniile retelei), cu antetul `x-api-key: EXTENSION_API_KEY`. E idempotent:
 * termenul curent se inregistreaza in promo_announcements (unic pe eticheta),
 * deci fiecare prelungire se anunta O SINGURA data, indiferent cate apeluri vin.
 *
 * Termenul in sine NU depinde de cron — se calculeaza singur (PROMO_ROLLING).
 * Cronul face doar anuntul pe email catre toti oamenii din sistem.
 */
export async function POST(req: NextRequest) {
  const key = req.headers.get("x-api-key");
  if (!key || key !== process.env.EXTENSION_API_KEY) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  const label = promoDeadlineLabel();
  if (!label) {
    return NextResponse.json({ ok: true, skipped: "oferta nu mai are termen (dupa 31 decembrie)" });
  }

  // Anuntam DOAR prelungirile, nu si primul termen: cine s-a inscris a vazut
  // deja termenul initial pe site — un email "a fost prelungita pana pe X"
  // inainte ca X sa fie o prelungire reala ar fi fals.
  const anchorLabel = promoDeadlineLabel(new Date(PROMO_ROLLING.anchorIso).getTime() - 1);
  const isExtension = label !== anchorLabel;

  try {
    // Primul termen se doar inregistreaza (fara email), ca baza de comparatie.
    const inserted = await db
      .insert(promoAnnouncements)
      .values({ deadlineLabel: label })
      .onConflictDoNothing({ target: promoAnnouncements.deadlineLabel })
      .returning({ id: promoAnnouncements.id });

    if (inserted.length === 0) {
      return NextResponse.json({ ok: true, skipped: `termenul "${label}" e deja anuntat` });
    }
    if (!isExtension) {
      return NextResponse.json({ ok: true, skipped: `"${label}" e termenul initial — inregistrat fara email` });
    }

    const rows = await db.select({ email: users.email, name: users.name }).from(users);
    const seen = new Set<string>();
    const recipients = rows.filter((r) => {
      const e = (r.email || "").trim().toLowerCase();
      if (!e || seen.has(e)) return false;
      seen.add(e);
      return true;
    });

    const deadlineDate = currentPromoDeadline();
    let sent = 0;
    for (const r of recipients) {
      const firstName = (r.name || "").trim().split(/\s+/)[0] || "antreprenor";
      const res = await sendEmail({
        to: r.email,
        subject: `Oferta de 500 lei a fost prelungită — până pe ${label}`,
        listUnsubscribe: defaultListUnsubscribe(),
        html: wrapEmail(
          `Prelungit: 50 de ziare pentru 500 lei`,
          `
          <p>Salut ${firstName},</p>
          <p>Veste bună: oferta de intrare — <strong>un articol publicat în 50 de ziare pentru 500 lei</strong> — a fost prelungită până pe <strong>${label}</strong>.</p>
          <p>Pe scurt, ce primești: articol unic pe fiecare ziar (zero conținut duplicat), 50 de backlinks dofollow, publicare în maximum 12 ore lucrătoare, raport complet cu linkurile și factură fiscală.</p>
          <p style="margin:24px 0;text-align:center;"><a href="${SITE.url}/oferta-500" style="display:inline-block;background:#c1121f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Comandă acum — 500 lei</a></p>
          <p>Întrebări? Răspunde la acest email sau scrie-ne pe WhatsApp la <strong>${SITE.phone}</strong>.</p>
          <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
          `,
        ),
      });
      if (res.ok) sent++;
    }

    await db
      .update(promoAnnouncements)
      .set({ sentCount: sql`${promoAnnouncements.sentCount} + ${sent}` })
      .where(eq(promoAnnouncements.deadlineLabel, label));

    console.log(`[promo-announce] termen "${label}" (pana la ${deadlineDate?.toISOString()}): ${sent}/${recipients.length} emailuri trimise`);
    return NextResponse.json({ ok: true, deadline: label, recipients: recipients.length, sent });
  } catch (err) {
    console.error("[promo-announce] eroare:", err);
    return NextResponse.json({ ok: false, error: "Eroare interna" }, { status: 500 });
  }
}
