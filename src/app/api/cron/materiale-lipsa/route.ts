import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, isNotNull, lt, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderSubmissions } from "@/db/schema";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { signOrderToken } from "@/lib/order-token";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";
import { findPackageById } from "@/data/packages";
import { waLink } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 07.09.2026 — clientul care a platit cu cardul si n-a trimis materialul.
 *
 * La card, Stripe ia banii primii, iar articolul se cere abia dupa — un al
 * doilea pas, dupa ce omul simte ca a terminat. Enache Toma a platit 500 de
 * lei si a inchis tabul; proprietarul a aflat abia uitandu-se in admin, ore
 * mai tarziu. La OP nu se intampla niciodata: acolo materialul vine inainte
 * de plata.
 *
 * Ruta asta trece la fiecare cateva minute peste platile confirmate care nu
 * au material si trimite:
 *   - dupa 10 MINUTE, catre client: linkul lui de trimitere, cu „dumneavoastra".
 *     Zece minute, nu o ora (decizia proprietarului): cine chiar completeaza
 *     formularul termina in intervalul asta, iar cine a inchis tabul primeste
 *     linkul cat inca tine minte ca a platit.
 *   - dupa 3 ZILE, catre proprietar: alerta cu telefonul clientului si linkul
 *     de admin, ca sa-l poata suna sau scrie pe WhatsApp.
 *
 * Fiecare pleaca O SINGURA data: momentul se scrie pe comanda
 * (material_reminder_at / material_alert_at), deci cronul poate rula oricat
 * de des fara sa deranjeze pe nimeni de doua ori.
 *
 * Apel: POST /api/cron/materiale-lipsa cu antetul `x-api-key: EXTENSION_API_KEY`,
 * din acelasi cron extern care ruleaza deja promo-announce. La 5 minute.
 */

const MINUTE = 60 * 1000;
const PRAG_REAMINTIRE = 10 * MINUTE;
const PRAG_ALERTA = 3 * 24 * 60 * MINUTE;

/** Comenzile platite, fara material, mai vechi decat pragul dat. */
async function faraMaterial(prag: number, campGol: "reminder" | "alert") {
  const inainteDe = new Date(Date.now() - prag);
  // Referintele pentru care materialul a ajuns deja la noi.
  const trimise = await db
    .select({ ref: orderSubmissions.stripeSessionId })
    .from(orderSubmissions);
  const refuri = trimise.map((t) => t.ref).filter(Boolean) as string[];

  const conditii = [
    eq(orders.status, "paid"),
    isNotNull(orders.stripeSessionId),
    lt(orders.createdAt, inainteDe),
    campGol === "reminder"
      ? isNull(orders.materialReminderAt)
      : isNull(orders.materialAlertAt),
  ];
  // La alerta ne intereseaza doar cei carora le-am trimis deja reamintirea:
  // daca n-a plecat nici aia, ceva e in neregula si nu escaladam pe orb.
  if (campGol === "alert") conditii.push(isNotNull(orders.materialReminderAt));
  if (refuri.length) conditii.push(notInArray(orders.stripeSessionId, refuri));

  return db
    .select({
      id: orders.id,
      email: orders.email,
      packageId: orders.packageId,
      amount: orders.amount,
      sessionId: orders.stripeSessionId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(...conditii))
    .limit(50);
}

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-api-key");
  if (!key || key !== process.env.EXTENSION_API_KEY) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  await ensureOrderColumns();

  let reamintiri = 0;
  let alerte = 0;
  const erori: string[] = [];

  // ——— 1. Reamintirea catre client, la 10 minute ———
  for (const o of await faraMaterial(PRAG_REAMINTIRE, "reminder")) {
    if (!o.sessionId) continue;
    // Semnarea si trimiterea stau AMANDOUA in try: daca semnarea arunca (a
    // lipsit o data SESSION_SECRET), pana acum cadea toata bucla si nu mai
    // primea nimeni nimic. O comanda stricata nu are voie sa le opreasca pe
    // celelalte.
    try {
      const link = `${SITE.url}/articol/${signOrderToken({
        sessionId: o.sessionId,
        email: o.email,
        packageId: o.packageId,
      })}`;
      const prenume = o.email.split("@")[0].split(/[._-]/)[0];
      const numeFrumos = prenume.charAt(0).toUpperCase() + prenume.slice(1);

      await sendEmail({
        to: o.email,
        subject: "Mai avem nevoie de articolul dumneavoastră ca să publicăm",
        html: wrapEmail(
          "Mai avem nevoie de articol",
          `
      <p>Bună ziua, ${esc(numeFrumos)},</p>
      <p>Plata a fost confirmată, vă mulțumim. Ca să putem publica, mai avem nevoie de materialul dumneavoastră — durează două minute:</p>
      <p style="margin:20px 0;">
        <a href="${link}" style="background:#c1121f;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;">Trimiteți articolul →</a>
      </p>
      <p><strong>Nu aveți articol scris?</strong> Îl scriem noi, e inclus în preț. Pe aceeași pagină ne dați site-ul și două-trei propoziții despre ce vreți să comunicați, iar noi vi-l trimitem spre citire înainte de publicare.</p>
      <p>De la primirea materialelor publicăm în <strong>maximum 12 ore lucrătoare</strong> pe toate cele 50 de ziare și revenim cu raportul care conține toate linkurile.</p>
      <p style="color:#64748b;font-size:13px;">Dacă vă e mai ușor, ne puteți trimite totul și pe WhatsApp, la <a href="${waLink(SITE.phone) || "#"}" style="color:#c1121f;">${esc(SITE.phone)}</a>.</p>
      <p style="margin-top:24px;">Cu stimă,<br/><strong>Echipa MediaExpres</strong></p>
    `,
        ),
      });
      await db
        .update(orders)
        .set({ materialReminderAt: new Date() })
        .where(eq(orders.id, o.id));
      reamintiri++;
    } catch (e) {
      erori.push(`reamintire ${o.email}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // ——— 2. Alerta catre proprietar, la 3 zile ———
  for (const o of await faraMaterial(PRAG_ALERTA, "alert")) {
    const pkg = findPackageById(o.packageId);
    try {
      await sendEmail({
        to: ADMIN_EMAIL,
        replyTo: o.email,
        subject: `⚠️ Plătit de 3 zile, fără material — ${o.email}`,
        html: wrapEmail(
          "Comandă plătită fără material, de 3 zile",
          `
      <p>Clientul a plătit, a primit reamintirea automată și tot n-a trimis articolul. Merită un telefon sau un mesaj pe WhatsApp.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
        ${kv("Email", o.email)}
        ${kv("Pachet", pkg?.name || o.packageId)}
        ${kv("Sumă", `${(o.amount / 100).toFixed(2)} RON`)}
        ${kv("Plătit la", o.createdAt.toLocaleString("ro-RO"))}
      </table>
      <p><a href="${SITE.url}/admin/materiale">Deschide Materiale în admin</a></p>
    `,
        ),
      });
      await db
        .update(orders)
        .set({ materialAlertAt: new Date() })
        .where(eq(orders.id, o.id));
      alerte++;
    } catch (e) {
      erori.push(`alerta ${o.email}: ${e instanceof Error ? e.message : e}`);
    }
  }

  return NextResponse.json({ ok: true, reamintiri, alerte, erori });
}
