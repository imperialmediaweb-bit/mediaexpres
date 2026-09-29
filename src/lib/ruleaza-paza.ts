import { and, asc, eq, gt, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions, placements, publishers } from "@/db/schema";
import { ensureOrderColumns, ensurePlacementTables } from "@/lib/ensure-columns";
import { parseazaLinkuri } from "@/lib/articol-html";
import { domeniuDin } from "@/lib/autoritate";
import {
  verificaLink,
  eBlocant,
  ETICHETE_LINK,
  ZILE_INTRE_VERIFICARI,
  ZILE_REVERIFICARE_PROBLEMA,
  CONFIRMARI_PROBLEMA,
  CONFIRMARI_EROARE,
  ZILE_REPARARE,
  type RezultatVerificare,
  type StareLink,
} from "@/lib/paza-linkuri";
import { semneazaToken } from "@/lib/plasare-token";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";

const ZI = 24 * 60 * 60 * 1000;

type Plasare = typeof placements.$inferSelect;
type Publicatie = typeof publishers.$inferSelect;

/** Domeniile clientului: din linkurile cerute si din site-ul trecut la comanda. */
export async function domeniiClient(pl: Plasare): Promise<string[]> {
  const din = parseazaLinkuri(pl.linkNotes).map((l) => domeniuDin(l.url));
  if (pl.orderSubmissionId) {
    const [c] = await db
      .select({ siteUrl: orderSubmissions.siteUrl })
      .from(orderSubmissions)
      .where(eq(orderSubmissions.id, pl.orderSubmissionId))
      .limit(1);
    din.push(domeniuDin(c?.siteUrl || ""));
  }
  return Array.from(new Set(din.filter((x): x is string => Boolean(x))));
}

export async function verificaPlasare(pl: Plasare, pub: Publicatie | undefined, url?: string): Promise<RezultatVerificare> {
  return verificaLink({
    url: url || pl.publishedUrl || "",
    domeniiClient: await domeniiClient(pl),
    dofollow: pl.dofollowExpected !== false,
    doarPagina: pub?.kind === "influencer",
  });
}

/**
 * O trecere a pazei: ia cateva plasari scadente si le verifica. Rulata din
 * cronul de 5 minute, deci putine pe rand — nimic nu sta blocat.
 */
export async function ruleazaPazaLinkuri(limita = 6): Promise<{ verificate: number; probleme: number }> {
  await Promise.all([ensureOrderColumns(), ensurePlacementTables()]);
  const acum = new Date();
  const scadente = await db
    .select()
    .from(placements)
    .where(
      and(
        eq(placements.status, "publicat"),
        isNotNull(placements.publishedUrl),
        or(isNull(placements.onlineUntil), gt(placements.onlineUntil, acum)),
        or(
          isNull(placements.linkCheckedAt),
          and(eq(placements.linkStatus, "ok"), lt(placements.linkCheckedAt, new Date(acum.getTime() - ZILE_INTRE_VERIFICARI * ZI))),
          and(
            sql`coalesce(${placements.linkStatus}, '') <> 'ok'`,
            lt(placements.linkCheckedAt, new Date(acum.getTime() - ZILE_REVERIFICARE_PROBLEMA * ZI)),
          ),
        ),
      ),
    )
    .orderBy(asc(sql`coalesce(${placements.linkCheckedAt}, 'epoch'::timestamp)`))
    .limit(limita);

  let probleme = 0;
  for (const pl of scadente) {
    const [pub] = await db.select().from(publishers).where(eq(publishers.id, pl.publisherId)).limit(1);
    const r = await verificaPlasare(pl, pub);
    if (r.stare !== "ok") probleme++;
    await aplicaRezultat(pl, pub, r);
  }
  return { verificate: scadente.length, probleme };
}

async function aplicaRezultat(pl: Plasare, pub: Publicatie | undefined, r: RezultatVerificare) {
  const acum = new Date();
  const nume = pub?.siteName || "publicația";

  if (r.stare === "ok") {
    await db
      .update(placements)
      .set({ linkStatus: "ok", linkDetail: r.detalii, linkCheckedAt: acum, linkFailCount: 0, linkAlertAt: null, linkEscalatedAt: null })
      .where(eq(placements.id, pl.id));
    if (pl.linkAlertAt) {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `✅ Link reparat — ${nume}`,
        html: wrapEmail("Link reparat", `<p>${esc(pl.articleTitle)} — ${esc(nume)}: ${esc(r.detalii)}.</p>`),
      }).catch(() => {});
    }
    return;
  }

  const esec = (pl.linkFailCount ?? 0) + 1;
  await db
    .update(placements)
    .set({ linkStatus: r.stare, linkDetail: r.detalii, linkCheckedAt: acum, linkFailCount: esec })
    .where(eq(placements.id, pl.id));

  const prag = eBlocant(r.stare) ? CONFIRMARI_PROBLEMA : CONFIRMARI_EROARE;
  if (esec < prag) return;

  const eticheta = ETICHETE_LINK[r.stare as StareLink];
  if (!pl.linkAlertAt) {
    await db.update(placements).set({ linkAlertAt: acum }).where(eq(placements.id, pl.id));
    if (pub?.contactEmail && eBlocant(r.stare)) {
      const link = `${SITE.url}/plasare/${semneazaToken({ scope: "plasare", id: pl.id, v: pl.tokenVersion ?? 0 })}`;
      await sendEmail({
        to: pub.contactEmail,
        subject: `Problemă la articolul publicat pe ${nume}`,
        html: wrapEmail(
          "Articolul trebuie reparat",
          `<p>La verificarea automată a articolului <strong>„${esc(pl.articleTitle)}"</strong> am găsit:</p>
           <p style="background:#fef2f2;padding:12px;border-radius:8px;"><strong>${esc(eticheta)}</strong><br/><span style="color:#64748b;font-size:13px;">${esc(r.detalii)}</span></p>
           <p>Te rugăm să-l repari în ${ZILE_REPARARE} zile. Până atunci, suma pentru el nu poate fi cerută la plată.</p>
           <table style="width:100%;border-collapse:collapse;">${kv("Adresa", `<a href="${esc(pl.publishedUrl || "")}">${esc(pl.publishedUrl || "")}</a>`)}</table>
           <p style="margin:20px 0;"><a href="${link}" style="background:#C8102E;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Vezi articolul și linkurile</a></p>`,
        ),
        replyTo: ADMIN_EMAIL,
      }).catch(() => {});
    }
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `🔗 Link cu problemă — ${nume}`,
      html: wrapEmail(
        "Link cu problemă",
        `<table style="width:100%;border-collapse:collapse;">
          ${kv("Publicație", esc(nume))}
          ${kv("Articol", esc(pl.articleTitle))}
          ${kv("Problema", esc(eticheta))}
          ${kv("Detalii", esc(r.detalii))}
          ${kv("Adresa", `<a href="${esc(pl.publishedUrl || "")}">${esc(pl.publishedUrl || "")}</a>`)}
        </table>
        <p>${eBlocant(r.stare) ? `Partenerul a fost anunțat și are ${ZILE_REPARARE} zile. Plata pentru articol e oprită.` : "Site-ul nu răspunde; mai încercăm."}</p>
        <p><a href="${SITE.url}/admin/plasari/${pl.id}">Deschide plasarea</a></p>`,
      ),
    }).catch(() => {});
    return;
  }

  if (!pl.linkEscalatedAt && acum.getTime() - new Date(pl.linkAlertAt).getTime() > ZILE_REPARARE * ZI) {
    await db.update(placements).set({ linkEscalatedAt: acum }).where(eq(placements.id, pl.id));
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `⚠️ Link NEREPARAT după ${ZILE_REPARARE} zile — ${nume}`,
      html: wrapEmail(
        "Link nereparat",
        `<p>${esc(pl.articleTitle)} — ${esc(nume)}: ${esc(eticheta)}.</p>
         <p>Clientului îi datorăm articolul: mută-l pe altă publicație sau returnează-i banii pentru el.</p>
         <p><a href="${SITE.url}/admin/plasari/${pl.id}">Deschide plasarea</a></p>`,
      ),
    }).catch(() => {});
  }
}
