import { and, asc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions, placementMessages, placements, publishers } from "@/db/schema";
import { ensurePlacementTables } from "@/lib/ensure-columns";
import { verificaContact, mesajBlocare, ETICHETE_MOTIV } from "@/lib/filtru-contact";
import { parseazaLinkuri } from "@/lib/articol-html";
import { domeniuDin } from "@/lib/autoritate";
import { semneazaToken } from "@/lib/plasare-token";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";

/**
 * Chatul dupa comanda: clientul, publicatia partenera si noi, intr-un singur
 * fir pe plasare. Cei doi nu se cunosc: partenerul vede „Clientul", clientul
 * vede numele publicatiei (pe care l-a ales oricum din catalog).
 *
 * Fiecare mesaj trece prin filtrul de contact. Cel prins nu pleaca: ramane
 * salvat cu motivul, adminul primeste alerta, iar expeditorul afla de ce.
 */

export type Expeditor = "client" | "partener" | "admin";

export const LUNGIME_MAXIMA = 2000;
/** Peste atat intr-o ora, pe acelasi fir si de la acelasi om, oprim. */
export const MESAJE_PE_ORA = 30;
/** Un singur email de notificare pe rafala: nu la fiecare „ok, multumesc". */
const PAUZA_NOTIFICARE_MIN = 15;

export interface MesajVizibil {
  id: string;
  sender: Expeditor;
  body: string;
  blocked: string | null;
  createdAt: string;
}

export async function mesajeleFirului(placementId: string, pentru: Expeditor): Promise<MesajVizibil[]> {
  await ensurePlacementTables();
  const rows = await db
    .select()
    .from(placementMessages)
    .where(
      pentru === "admin"
        ? eq(placementMessages.placementId, placementId)
        : and(eq(placementMessages.placementId, placementId), isNull(placementMessages.blocked)),
    )
    .orderBy(asc(placementMessages.createdAt));
  return rows.map((m) => ({
    id: m.id,
    sender: m.sender as Expeditor,
    body: m.body,
    blocked: m.blocked,
    createdAt: new Date(m.createdAt).toISOString(),
  }));
}

export type RezultatMesaj = { ok: true; mesaj: MesajVizibil } | { ok: false; status: number; error: string };

export async function trimiteMesaj(d: { placementId: string; sender: Expeditor; text: string }): Promise<RezultatMesaj> {
  await ensurePlacementTables();
  const text = d.text.trim().slice(0, LUNGIME_MAXIMA);
  if (!text) return { ok: false, status: 400, error: "Mesajul e gol." };

  const [pl] = await db.select().from(placements).where(eq(placements.id, d.placementId)).limit(1);
  if (!pl) return { ok: false, status: 404, error: "Comanda nu există." };
  const [pub] = await db.select().from(publishers).where(eq(publishers.id, pl.publisherId)).limit(1);
  const [cmd] = pl.orderSubmissionId
    ? await db.select().from(orderSubmissions).where(eq(orderSubmissions.id, pl.orderSubmissionId)).limit(1)
    : [];

  const oraInUrma = new Date(Date.now() - 60 * 60 * 1000);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(placementMessages)
    .where(
      and(
        eq(placementMessages.placementId, pl.id),
        eq(placementMessages.sender, d.sender),
        gt(placementMessages.createdAt, oraInUrma),
      ),
    );
  if (d.sender !== "admin" && n >= MESAJE_PE_ORA) {
    return { ok: false, status: 429, error: "Prea multe mesaje într-o oră. Revino puțin mai târziu." };
  }

  // Domeniile care au voie sa apara: site-ul clientului si linkurile cerute
  // (partenerul le vede oricum in articol), site-ul publicatiei si adresa
  // articolului publicat.
  const permise = [
    ...parseazaLinkuri(pl.linkNotes).map((l) => domeniuDin(l.url)),
    domeniuDin(cmd?.siteUrl || ""),
    domeniuDin(pub?.siteUrl || ""),
    domeniuDin(pl.publishedUrl || ""),
  ].filter((x): x is string => Boolean(x));

  const motiv = d.sender === "admin" ? null : verificaContact(text, permise);

  const [rand] = await db
    .insert(placementMessages)
    .values({ placementId: pl.id, sender: d.sender, body: text, blocked: motiv })
    .returning();

  const numePub = pub?.siteName || "publicația parteneră";

  if (motiv) {
    const [{ incercari }] = await db
      .select({ incercari: sql<number>`count(*)::int` })
      .from(placementMessages)
      .where(and(eq(placementMessages.placementId, pl.id), sql`${placementMessages.blocked} is not null`));
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `🚫 Încercare de schimb de contact — ${d.sender === "client" ? "clientul" : numePub}`,
      html: wrapEmail(
        "Mesaj oprit în chat",
        `<table style="width:100%;border-collapse:collapse;">
          ${kv("Cine", d.sender === "client" ? `Clientul (${esc(cmd?.email || "—")})` : esc(numePub))}
          ${kv("Conținea", esc(ETICHETE_MOTIV[motiv]))}
          ${kv("Articol", esc(pl.articleTitle))}
          ${kv("Încercări pe comanda asta", String(incercari))}
        </table>
        <p style="background:#f8fafc;padding:12px;border-radius:8px;white-space:pre-wrap;">${esc(text)}</p>
        <p><a href="${SITE.url}/admin/plasari/${pl.id}">Vezi discuția în admin</a></p>`,
      ),
    }).catch(() => {});
    return { ok: false, status: 422, error: mesajBlocare(motiv) };
  }

  // Notificarea: celalalt afla pe email ca are mesaj, cu link inapoi in
  // platforma. Raspunsul pe email ajunge la noi (replyTo), nu la expeditor.
  const [anterior] = await db
    .select({ id: placementMessages.id })
    .from(placementMessages)
    .where(
      and(
        eq(placementMessages.placementId, pl.id),
        eq(placementMessages.sender, d.sender),
        isNull(placementMessages.blocked),
        ne(placementMessages.id, rand.id),
        gt(placementMessages.createdAt, new Date(Date.now() - PAUZA_NOTIFICARE_MIN * 60 * 1000)),
      ),
    )
    .limit(1);

  if (!anterior) {
    const deLa = d.sender === "client" ? "Clientul" : d.sender === "admin" ? SITE.name : numePub;
    const catre: { email: string; link: string }[] = [];
    if (d.sender !== "partener" && pub?.contactEmail) {
      catre.push({
        email: pub.contactEmail,
        link: `${SITE.url}/plasare/${semneazaToken({ scope: "plasare", id: pl.id, v: pl.tokenVersion ?? 0 })}#mesaje`,
      });
    }
    if (d.sender !== "client" && cmd?.email) {
      catre.push({
        email: cmd.email,
        link: `${SITE.url}/comanda-mea/${semneazaToken({ scope: "client", id: cmd.id, v: 0 })}#${pl.id}`,
      });
    }
    for (const c of catre) {
      await sendEmail({
        to: c.email,
        subject: `Mesaj nou de la ${deLa} — „${pl.articleTitle.slice(0, 60)}"`,
        html: wrapEmail(
          "Ai un mesaj nou",
          `<p><strong>${esc(deLa)}</strong> ți-a scris despre articolul <strong>„${esc(pl.articleTitle)}"</strong>:</p>
           <p style="background:#f8fafc;padding:12px;border-radius:8px;white-space:pre-wrap;">${esc(text)}</p>
           <p style="margin:20px 0;"><a href="${c.link}" style="background:#C8102E;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Răspunde în platformă</a></p>
           <p style="color:#64748b;font-size:13px;">Discuția are loc doar prin ${SITE.name}. Mesajele cu telefon, email sau alte date de contact nu sunt transmise.</p>`,
        ),
        replyTo: ADMIN_EMAIL,
      }).catch(() => {});
    }
  }

  return {
    ok: true,
    mesaj: {
      id: rand.id,
      sender: d.sender,
      body: rand.body,
      blocked: null,
      createdAt: new Date(rand.createdAt).toISOString(),
    },
  };
}

/** Plasarile unei comenzi, pentru pagina clientului. */
export async function plasarileComenzii(orderSubmissionId: string) {
  await ensurePlacementTables();
  return db
    .select({
      id: placements.id,
      status: placements.status,
      publishedUrl: placements.publishedUrl,
      deadlinePublicare: placements.deadlinePublicare,
      nume: publishers.siteName,
      site: publishers.siteUrl,
    })
    .from(placements)
    .innerJoin(publishers, eq(publishers.id, placements.publisherId))
    .where(eq(placements.orderSubmissionId, orderSubmissionId))
    .orderBy(asc(placements.sentAt));
}
