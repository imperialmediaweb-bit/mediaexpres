import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions } from "@/db/schema";
import { cronAutorizat } from "@/lib/cron-auth";
import { campaniileDinRetea } from "@/lib/retea";
import { campaniaComenzii } from "@/lib/raport-retea";
import { raportUrl } from "@/lib/raport-link";
import { ritmDupaId } from "@/lib/ritm";
import { sendEmail, wrapEmail, escapeHtml, ADMIN_EMAIL } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 12.11.2026 (user: „când pornim campania, îl anunțăm prin email că a pornit
 * și că linkurile încep să apară în funcție de eșalonare"; „da").
 *
 * La 10 minute: comenzile plătite al căror prim articol a apărut live în rețea
 * primesc O SINGURĂ dată e-mailul „campania a pornit", cu ritmul ales și
 * linkul raportului de pe mediaexpress.ro. Momentul se scrie pe comandă
 * (`campanie_pornita_anuntat_la`). Doar comenzile din 12.11.2026 încoace —
 * cele vechi, deja publicate, nu primesc un „a pornit" întârziat.
 * E-mailul de final îl trimite rețeaua (cron campanie-gata), cu același raport.
 */
const DE_LA = new Date("2026-11-12T00:00:00+02:00");

let coloana = false;
async function asiguraColoana() {
  if (coloana) return;
  await db.execute(sql`ALTER TABLE order_submissions ADD COLUMN IF NOT EXISTS campanie_pornita_anuntat_la timestamp`);
  coloana = true;
}

async function ruleaza(req: NextRequest) {
  if (!cronAutorizat(req.headers)) return NextResponse.json({ ok: false, error: "neautorizat" }, { status: 401 });
  if (process.env.CAMPANIE_PORNITA === "0") return NextResponse.json({ ok: true, oprit: true });
  await asiguraColoana();

  const comenzi = await db
    .select({
      id: orderSubmissions.id,
      ref: orderSubmissions.stripeSessionId,
      email: orderSubmissions.email,
      title: orderSubmissions.title,
      ritm: orderSubmissions.ritm,
      createdAt: orderSubmissions.createdAt,
    })
    .from(orderSubmissions)
    .where(
      and(
        gte(orderSubmissions.createdAt, DE_LA),
        ne(orderSubmissions.status, "pending_payment"),
        isNull(sql`campanie_pornita_anuntat_la`),
      ),
    )
    .limit(50);
  if (!comenzi.length) return NextResponse.json({ ok: true, trimise: 0 });

  const toate = await campaniileDinRetea();
  if (!toate) return NextResponse.json({ ok: false, error: "reteaua nu a raspuns" }, { status: 502 });

  const trimise: string[] = [];
  for (const c of comenzi) {
    const g = campaniaComenzii(c, toate);
    if (!g || Number(g.rand.articole_live || 0) < 1) continue;
    const ritm = ritmDupaId(c.ritm);
    const link = raportUrl(c.id);
    const r = await sendEmail({
      to: c.email,
      subject: "Campania dumneavoastră a pornit — MediaExpres",
      replyTo: ADMIN_EMAIL,
      html: wrapEmail(
        "Campania a pornit",
        `<p>Bună ziua,</p>
        <p>Vă anunțăm că a pornit publicarea articolului <strong>„${escapeHtml(c.title || "")}"</strong>. Primul articol este deja online.</p>
        <p>Ritmul ales: <strong>${escapeHtml(ritm.eticheta)}</strong>. ${escapeHtml(ritm.explicatie)}</p>
        <p>Linkurile apar pe rând, pe măsură ce articolele sunt publicate. Le vedeți în timp real, cu data, ora și linkul fiecărui ziar, aici:</p>
        <p style="margin:20px 0;"><a href="${link}" style="display:inline-block;background:#E4002B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Vezi raportul în timp real</a></p>
        <p style="color:#64748b;font-size:13px;">${link}<br/>Linkul este permanent. Când ies toate articolele, vă anunțăm printr-un e-mail separat.</p>
        <p style="margin-top:24px;">Cu stimă,<br/><strong>Echipa MediaExpres</strong></p>`,
      ),
    });
    if (!r.ok) continue;
    await db.execute(sql`UPDATE order_submissions SET campanie_pornita_anuntat_la = NOW() WHERE id = ${c.id}`);
    trimise.push(c.id);
  }
  return NextResponse.json({ ok: true, trimise: trimise.length });
}

export const GET = ruleaza;
export const POST = ruleaza;
