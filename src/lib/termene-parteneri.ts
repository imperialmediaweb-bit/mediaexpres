import { and, eq, gt, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions, partnerDeductions, partnerStrikes, placements, publishers } from "@/db/schema";
import { ensureOrderColumns, ensurePlacementTables } from "@/lib/ensure-columns";
import { trimitePlasari } from "@/lib/trimite-plasari";
import { semneazaToken } from "@/lib/plasare-token";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";
import type { CheieOptiune } from "@/lib/optiuni-partener";

/**
 * Termenele partenerilor si ce se intampla cand nu le respecta (29.09.2026).
 *
 * Cerut de proprietar: „sa livreze la timp — ca oamenii pleaca, clientul".
 * Nu cu amenzi (nu se pot incasa fara proces), ci cu consecinte pe care
 * platforma le aplica singura, fiindca noi le tinem banii si comenzile:
 *   - reamintire cu 12 ore inainte de termen;
 *   - la termen, articolul se ia de la partener, fara plata, si se muta
 *     automat pe altul asemanator — clientul nu asteapta dupa nimeni;
 *   - abateri numarate pe 90 de zile: 1 avertisment, 2 suspendare 30 de
 *     zile, 3 scos din catalog;
 *   - articol platit si apoi sters: suma se recupereaza din plata urmatoare.
 * Regulile sunt scrise si in acordul acceptat la inscriere (/termeni-parteneri).
 */

export const TERMENI_VERSIUNE = "2026-09-29";
export const ORE_REAMINTIRE = 12;
export const ZILE_FEREASTRA_ABATERI = 90;
export const ZILE_SUSPENDARE = 30;
export const ABATERI_SUSPENDARE = 2;
export const ABATERI_EXCLUDERE = 3;

const ORA = 60 * 60 * 1000;
const ZI = 24 * ORA;

type Plasare = typeof placements.$inferSelect;
type Publicatie = typeof publishers.$inferSelect;

export type MotivAbatere = "intarziere" | "sters" | "link";
const MOTIV_TEXT: Record<MotivAbatere, string> = {
  intarziere: "articol nepublicat în termen",
  sters: "articol șters înainte de 12 luni",
  link: "link scos sau modificat înainte de 12 luni",
};

/** Ce se intampla la a N-a abatere din ultimele 90 de zile. */
export function consecinta(nrAbateri: number): "avertisment" | "suspendare" | "excludere" {
  if (nrAbateri >= ABATERI_EXCLUDERE) return "excludere";
  if (nrAbateri >= ABATERI_SUSPENDARE) return "suspendare";
  return "avertisment";
}

export async function inregistreazaAbatere(pub: Publicatie, placementId: string | null, motiv: MotivAbatere) {
  await db.insert(partnerStrikes).values({ publisherId: pub.id, placementId, reason: motiv });
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(partnerStrikes)
    .where(
      and(
        eq(partnerStrikes.publisherId, pub.id),
        gt(partnerStrikes.createdAt, new Date(Date.now() - ZILE_FEREASTRA_ABATERI * ZI)),
      ),
    );
  const ce = consecinta(n);
  const acum = new Date();

  if (ce === "suspendare" && pub.status === "approved") {
    await db
      .update(publishers)
      .set({
        status: "suspended",
        suspendedUntil: new Date(acum.getTime() + ZILE_SUSPENDARE * ZI),
        rejectionReason: `Suspendat automat ${ZILE_SUSPENDARE} de zile: ${n} abateri în ${ZILE_FEREASTRA_ABATERI} de zile.`,
      })
      .where(eq(publishers.id, pub.id));
  } else if (ce === "excludere") {
    await db
      .update(publishers)
      .set({
        status: "suspended",
        suspendedUntil: null,
        rejectionReason: `Scos din catalog: ${n} abateri în ${ZILE_FEREASTRA_ABATERI} de zile.`,
      })
      .where(eq(publishers.id, pub.id));
  }

  const panou = `${SITE.url}/cont-partener/${semneazaToken({ scope: "panou", id: pub.id, v: pub.tokenVersion ?? 0 })}`;
  const mesaj =
    ce === "avertisment"
      ? `<p>Este un <strong>avertisment</strong>. Încă o abatere în ${ZILE_FEREASTRA_ABATERI} de zile înseamnă suspendarea din catalog pentru ${ZILE_SUSPENDARE} de zile.</p>`
      : ce === "suspendare"
        ? `<p>Ai ${n} abateri în ${ZILE_FEREASTRA_ABATERI} de zile, așa că publicația ta e <strong>suspendată ${ZILE_SUSPENDARE} de zile</strong>: nu mai apare în catalog și nu mai primește articole. Revine automat după aceea. Soldul tău rămâne al tău.</p>`
        : `<p>Ai ${n} abateri în ${ZILE_FEREASTRA_ABATERI} de zile, așa că publicația ta a fost <strong>scoasă din catalog</strong>. Articolele deja publicate și plătibile se decontează normal.</p>`;
  await sendEmail({
    to: pub.contactEmail,
    subject:
      ce === "avertisment"
        ? `Avertisment — ${pub.siteName}`
        : ce === "suspendare"
          ? `Suspendat ${ZILE_SUSPENDARE} de zile — ${pub.siteName}`
          : `Scos din catalogul MediaExpres — ${pub.siteName}`,
    html: wrapEmail(
      "Abatere de la acordul de colaborare",
      `<p>Salut,</p>
       <p>Am înregistrat o abatere pentru <strong>${esc(pub.siteName)}</strong>: ${esc(MOTIV_TEXT[motiv])}.</p>
       ${mesaj}
       <p style="color:#64748b;font-size:13px;">Regulile sunt cele din <a href="${SITE.url}/termeni-parteneri">acordul pentru parteneri</a>, acceptat la înscriere. Contul tău: <a href="${panou}">aici</a>.</p>`,
    ),
    replyTo: ADMIN_EMAIL,
  }).catch(() => {});
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Abatere ${n}/${ABATERI_EXCLUDERE} — ${pub.siteName} (${ce})`,
    html: wrapEmail(
      "Abatere partener",
      `<table style="width:100%;border-collapse:collapse;">
        ${kv("Publicație", esc(pub.siteName))}
        ${kv("Motiv", esc(MOTIV_TEXT[motiv]))}
        ${kv("Abateri în 90 de zile", String(n))}
        ${kv("Consecință", ce)}
      </table>
      <p><a href="${SITE.url}/admin/parteneri/${pub.id}">Deschide partenerul</a></p>`,
    ),
  }).catch(() => {});
  return { n, ce };
}

function opt(pl: Plasare): { key: CheieOptiune; pret: number }[] {
  try {
    const a = JSON.parse(pl.options || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

/**
 * Inlocuitorul potrivit: acelasi tip, activ, fara abateri recente, care ofera
 * optiunile comandate, nu e deja in comanda si nu costa mai mult decat cel
 * cazut (altfel am pierde bani). Intai aceeasi zona, apoi aceeasi nisa,
 * apoi oricare; in fiecare grup, cel mai puternic.
 */
export async function gasesteInlocuitor(pl: Plasare): Promise<Publicatie | null> {
  const [vechi] = await db.select().from(publishers).where(eq(publishers.id, pl.publisherId)).limit(1);
  if (!vechi) return null;
  const optiuni = opt(pl);
  const tarifVechi = pl.pricePartner - optiuni.reduce((s, o) => s + (o.pret || 0), 0);

  const dejaInComanda = pl.orderSubmissionId
    ? (
        await db
          .select({ id: placements.publisherId })
          .from(placements)
          .where(eq(placements.orderSubmissionId, pl.orderSubmissionId))
      ).map((r) => r.id)
    : [];
  const cuAbateri = (
    await db
      .select({ id: partnerStrikes.publisherId })
      .from(partnerStrikes)
      .where(gt(partnerStrikes.createdAt, new Date(Date.now() - ZILE_FEREASTRA_ABATERI * ZI)))
  ).map((r) => r.id);
  const exclusi = new Set([vechi.id, ...dejaInComanda, ...cuAbateri]);

  const candidati = (
    await db
      .select()
      .from(publishers)
      .where(and(eq(publishers.status, "approved"), isNotNull(publishers.pricePerArticle), eq(publishers.kind, vechi.kind || "presa")))
  ).filter((p) => {
    if (exclusi.has(p.id) || !p.pricePerArticle || p.pricePerArticle > tarifVechi) return false;
    if (!optiuni.length) return true;
    let oferite: { key: string }[] = [];
    try {
      oferite = JSON.parse(p.extraOptions || "[]");
    } catch {
      /* fara optiuni */
    }
    return optiuni.every((o) => oferite.some((x) => x.key === o.key));
  });

  const scor = (p: Publicatie) =>
    (p.county && p.county === vechi.county ? 4 : 0) +
    (p.region && p.region === vechi.region ? 2 : 0) +
    (p.niche && p.niche === vechi.niche ? 1 : 0);
  candidati.sort(
    (a, b) =>
      scor(b) - scor(a) ||
      (b.domainAuthority ?? 0) - (a.domainAuthority ?? 0) ||
      (b.followers ?? 0) - (a.followers ?? 0),
  );
  return candidati[0] || null;
}

async function emailClient(pl: Plasare, subiect: string, continut: string) {
  if (!pl.orderSubmissionId) return;
  const [c] = await db
    .select({ id: orderSubmissions.id, email: orderSubmissions.email })
    .from(orderSubmissions)
    .where(eq(orderSubmissions.id, pl.orderSubmissionId))
    .limit(1);
  if (!c?.email) return;
  const link = `${SITE.url}/comanda-mea/${semneazaToken({ scope: "client", id: c.id, v: 0 })}`;
  await sendEmail({
    to: c.email,
    subject: subiect,
    html: wrapEmail(
      subiect,
      `<p>Bună ziua,</p>${continut.replace(/\{LINK\}/g, link)}
       <p style="margin:20px 0;"><a href="${link}" style="background:#C8102E;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Vezi comanda</a></p>
       <p style="margin-top:20px;">Cu respect,<br/><strong>Echipa ${SITE.name}</strong></p>`,
    ),
    replyTo: ADMIN_EMAIL,
  }).catch(() => {});
}

/**
 * Muta articolul unei plasari cazute pe alt partener. `fortat` = ales de
 * admin (fara plafonul de pret). Fara inlocuitor: alerta la admin, cu cele
 * trei variante (alt partener, reteaua noastra, banii inapoi).
 */
export async function inlocuiestePlasare(pl: Plasare, motiv: string, fortat?: Publicatie): Promise<{ ok: boolean; nume?: string }> {
  await Promise.all([ensureOrderColumns(), ensurePlacementTables()]);
  if (pl.replacedById) return { ok: true };
  const [vechi] = await db.select().from(publishers).where(eq(publishers.id, pl.publisherId)).limit(1);
  const nou = fortat || (await gasesteInlocuitor(pl));

  if (!nou) {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `⚠️ Fără înlocuitor — ${vechi?.siteName || "partener"} (${motiv})`,
      html: wrapEmail(
        "Articol fără înlocuitor",
        `<p><strong>${esc(pl.articleTitle)}</strong> — ${esc(vechi?.siteName || "")}: ${esc(motiv)}.</p>
         <p>Nu am găsit automat alt partener potrivit (același tip, activ, cel mult ${pl.pricePartner} lei). Alege din admin: alt partener, un ziar din rețeaua noastră, sau banii înapoi.</p>
         <p><a href="${SITE.url}/admin/plasari/${pl.id}">Rezolvă acum</a></p>`,
      ),
    }).catch(() => {});
    await emailClient(
      pl,
      `Ne ocupăm de articolul tău`,
      `<p>Publicația <strong>${esc(vechi?.siteName || "")}</strong> nu a putut publica articolul <strong>„${esc(pl.articleTitle)}"</strong>. Îl mutăm pe altă publicație sau îți returnăm banii pentru ea — îți scriem în cel mult o zi lucrătoare. Nu trebuie să faci nimic.</p>`,
    );
    return { ok: false };
  }

  let imagini: { url: string }[] = [];
  try {
    imagini = JSON.parse(pl.images || "[]");
  } catch {
    /* fara poze */
  }
  const r = await trimitePlasari({
    publisherIds: [nou.id],
    optiuni: { [nou.id]: opt(pl).map((o) => o.key) },
    title: pl.articleTitle,
    body: pl.articleBody,
    images: imagini,
    featuredIndex: pl.featuredIndex ?? 0,
    linkNotes: pl.linkNotes,
    orderSubmissionId: pl.orderSubmissionId,
    clientLabel: pl.clientLabel,
    pretClientFix: pl.priceClient,
    replacesId: pl.id,
    faraRezumat: true,
  });
  if (!r.ok || !r.plasari[0]) {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `⚠️ Înlocuirea n-a plecat — ${pl.articleTitle.slice(0, 60)}`,
      html: wrapEmail("Înlocuire eșuată", `<p>${esc(r.ok ? "fără plasare" : r.error)}</p><p><a href="${SITE.url}/admin/plasari/${pl.id}">Rezolvă din admin</a></p>`),
    }).catch(() => {});
    return { ok: false };
  }
  await db.update(placements).set({ replacedById: r.plasari[0].id }).where(eq(placements.id, pl.id));

  await emailClient(
    pl,
    `Articolul tău merge pe ${nou.siteName}`,
    `<p>Publicația <strong>${esc(vechi?.siteName || "")}</strong> nu a putut publica articolul <strong>„${esc(pl.articleTitle)}"</strong>, așa că l-am trimis pe <strong>${esc(nou.siteName)}</strong>, fără niciun cost pentru tine. Te anunțăm când apare.</p>
     <p style="color:#64748b;font-size:13px;">Preferi banii înapoi în locul noii publicații? Apasă „Prefer banii înapoi” pe pagina comenzii.</p>`,
  );
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `🔁 Mutat automat: ${vechi?.siteName || "?"} → ${nou.siteName}`,
    html: wrapEmail(
      "Articol mutat",
      `<table style="width:100%;border-collapse:collapse;">
        ${kv("Articol", esc(pl.articleTitle))}
        ${kv("De la", esc(vechi?.siteName || ""))}
        ${kv("La", esc(nou.siteName))}
        ${kv("Motiv", esc(motiv))}
        ${kv("Încasat / plătim acum", `${pl.priceClient} / ${r.totalLor} lei`)}
      </table>`,
    ),
  }).catch(() => {});
  return { ok: true, nume: nou.siteName };
}

/** Articol sters / link scos si nereparat: abatere, recuperare, inlocuire. */
export async function inchidePlasareStricata(pl: Plasare, motiv: "sters" | "link") {
  const [pub] = await db.select().from(publishers).where(eq(publishers.id, pl.publisherId)).limit(1);
  await db
    .update(placements)
    .set({ status: "anulat", adminNotes: `${pl.adminNotes ? pl.adminNotes + "\n" : ""}Anulat automat: ${MOTIV_TEXT[motiv]}.` })
    .where(eq(placements.id, pl.id));
  // Daca suma a intrat deja intr-o cerere de plata, o recuperam din urmatoarea.
  if (pl.statementId && pub) {
    await db.insert(partnerDeductions).values({
      publisherId: pub.id,
      placementId: pl.id,
      amount: pl.pricePartner,
      reason: `„${pl.articleTitle.slice(0, 60)}" — ${MOTIV_TEXT[motiv]}`,
    });
  }
  if (pub) await inregistreazaAbatere(pub, pl.id, motiv);
  await inlocuiestePlasare({ ...pl, status: "anulat" }, MOTIV_TEXT[motiv]);
}

/**
 * O trecere prin termene, din cronul de 5 minute: reamintiri, expirari cu
 * mutare automata, suspendari care s-au terminat.
 */
export async function ruleazaTermene(): Promise<{ reamintiri: number; expirate: number; reactivati: number }> {
  await Promise.all([ensureOrderColumns(), ensurePlacementTables()]);
  const acum = new Date();

  // 1. Reamintire cu 12 ore inainte de termen.
  const aproape = await db
    .select()
    .from(placements)
    .where(
      and(
        inArray(placements.status, ["trimis", "acceptat"]),
        isNull(placements.reminderSentAt),
        gt(placements.deadlinePublicare, acum),
        lt(placements.deadlinePublicare, new Date(acum.getTime() + ORE_REAMINTIRE * ORA)),
      ),
    )
    .limit(20);
  for (const pl of aproape) {
    await db.update(placements).set({ reminderSentAt: acum }).where(eq(placements.id, pl.id));
    const [pub] = await db.select().from(publishers).where(eq(publishers.id, pl.publisherId)).limit(1);
    if (!pub) continue;
    const link = `${SITE.url}/plasare/${semneazaToken({ scope: "plasare", id: pl.id, v: pl.tokenVersion ?? 0 })}`;
    await sendEmail({
      to: pub.contactEmail,
      subject: `⏰ Mai ai câteva ore: „${pl.articleTitle.slice(0, 50)}"`,
      html: wrapEmail(
        "Termenul de publicare se apropie",
        `<p>Articolul <strong>„${esc(pl.articleTitle)}"</strong> trebuie publicat până la <strong>${new Date(pl.deadlinePublicare).toLocaleString("ro-RO", { dateStyle: "long", timeStyle: "short" })}</strong>.</p>
         <p>După termen, articolul trece automat la altă publicație, fără plată, și se înregistrează o abatere.</p>
         <p style="margin:20px 0;"><a href="${link}" style="background:#C8102E;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Publică și lipește linkul</a></p>`,
      ),
      replyTo: ADMIN_EMAIL,
    }).catch(() => {});
  }

  // 2. Termen depasit: expira, abatere, mutare automata.
  const intarziate = await db
    .select()
    .from(placements)
    .where(and(inArray(placements.status, ["trimis", "acceptat"]), lt(placements.deadlinePublicare, acum)))
    .limit(10);
  for (const pl of intarziate) {
    const [marcat] = await db
      .update(placements)
      .set({ status: "expirat", expiredAt: acum })
      .where(and(eq(placements.id, pl.id), inArray(placements.status, ["trimis", "acceptat"])))
      .returning();
    if (!marcat) continue;
    const [pub] = await db.select().from(publishers).where(eq(publishers.id, pl.publisherId)).limit(1);
    if (pub) await inregistreazaAbatere(pub, pl.id, "intarziere");
    await inlocuiestePlasare(marcat, "nepublicat în termen");
  }

  // 3. Suspendarile automate care s-au terminat.
  const reveniti = await db
    .update(publishers)
    .set({ status: "approved", suspendedUntil: null, rejectionReason: null })
    .where(and(eq(publishers.status, "suspended"), isNotNull(publishers.suspendedUntil), lt(publishers.suspendedUntil, acum)))
    .returning({ id: publishers.id, nume: publishers.siteName, email: publishers.contactEmail });
  for (const p of reveniti) {
    await sendEmail({
      to: p.email,
      subject: `Ai revenit în catalog — ${p.nume}`,
      html: wrapEmail("Suspendarea s-a încheiat", `<p>${esc(p.nume)} apare din nou în catalogul MediaExpres și poate primi articole. Te rugăm să respecți termenele.</p>`),
    }).catch(() => {});
  }

  return { reamintiri: aproape.length, expirate: intarziate.length, reactivati: reveniti.length };
}

/**
 * „Livreaza la timp": din plasarile incheiate ale unui partener, cate au
 * fost publicate in termen. Sub 3 comenzi nu spunem nimic (prea putin).
 */
export async function seriozitatePeParteneri(): Promise<Map<string, { laTimp: number; total: number }>> {
  const rows = await db
    .select({
      id: placements.publisherId,
      laTimp: sql<number>`count(*) filter (where ${placements.status} in ('publicat','finalizat') and ${placements.publishedAt} <= ${placements.deadlinePublicare})::int`,
      total: sql<number>`count(*) filter (where ${placements.status} in ('publicat','finalizat','expirat') or (${placements.status} = 'anulat' and ${placements.publishedAt} is not null))::int`,
    })
    .from(placements)
    .groupBy(placements.publisherId);
  return new Map(rows.map((r) => [r.id, { laTimp: r.laTimp, total: r.total }]));
}

export function procentLaTimp(s: { laTimp: number; total: number } | undefined): number | null {
  if (!s || s.total < 3) return null;
  return Math.round((s.laTimp / s.total) * 100);
}
