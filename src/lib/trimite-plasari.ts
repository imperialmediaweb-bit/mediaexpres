import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { placements, publishers } from "@/db/schema";
import { ensureOrderColumns, ensurePlacementTables } from "@/lib/ensure-columns";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";
import { semneazaToken } from "@/lib/plasare-token";
import { termenePlasare, ZILE_PUBLICARE, ZILE_REFUZ, LUNI_ONLINE } from "@/lib/plasari";
import { adaosPentru } from "@/lib/niveluri-publicatii";
import { citesteOptiuni, etichetaOptiune, pretOptiuneClient, type CheieOptiune } from "@/lib/optiuni-partener";

/**
 * Trimiterea unui articol catre publicatii partenere — un singur loc, folosit
 * si de admin (manual) si de comanda platita (automat, cand vine articolul).
 *
 * 29.09.2026 — scos din /api/admin/placements, ca drumul automat sa faca
 * EXACT ce face butonul din admin: aceleasi garzi, aceleasi preturi
 * inghetate, acelasi email catre partener.
 *
 * Emailul catre partener NU contine, niciodata: numele clientului, contactul
 * lui, pretul incasat de noi, ce pachet a cumparat.
 */

export interface CererePlasari {
  publisherIds: string[];
  /** Optiunile comandate, pe publicatie (id -> chei). */
  optiuni?: Record<string, CheieOptiune[]>;
  title: string;
  body: string;
  images: { url: string }[];
  featuredIndex: number;
  linkNotes?: string | null;
  orderSubmissionId?: string | null;
  clientLabel?: string | null;
  /**
   * Inlocuire (lib/termene-parteneri.ts): clientul a platit deja, deci pretul
   * lui ramane cel initial, iar plasarea noua tine minte pe cine inlocuieste.
   */
  pretClientFix?: number;
  replacesId?: string;
  /** Fara emailul de rezumat catre admin (inlocuirea trimite unul propriu). */
  faraRezumat?: boolean;
}

export type RezultatPlasari =
  | { ok: true; plasari: { id: string; publicatie: string; email: string }[]; totalNoua: number; totalLor: number }
  | { ok: false; status: number; error: string };

export async function trimitePlasari(d: CererePlasari): Promise<RezultatPlasari> {
  await Promise.all([ensureOrderColumns(), ensurePlacementTables()]);

  const alese = await db.select().from(publishers).where(inArray(publishers.id, d.publisherIds));

  const fara = alese.filter((p) => p.status !== "approved" || !p.pricePerArticle);
  if (fara.length) {
    // O plasare fara tarif = nu stim cat datoram; o publicatie suspendata nu
    // mai are voie sa primeasca articole.
    return {
      ok: false,
      status: 409,
      error: `Nu au tarif sau nu sunt active: ${fara.map((p) => p.siteName).join(", ")}. Pune-le nivelul din pagina publicației.`,
    };
  }
  if (alese.length !== d.publisherIds.length) return { ok: false, status: 404, error: "O publicație nu există" };

  const acum = new Date();
  const { deadlineRefuz, deadlinePublicare } = termenePlasare(acum);
  // Adaosul depinde de CATE plasari are comanda: pragurile de volum (3/5/10)
  // taie doar din partea noastra, nu din tariful publicatiei.
  const adaos = adaosPentru(alese.length);
  const create: { id: string; publicatie: string; email: string }[] = [];
  let totalNoua = 0;
  let totalLor = 0;

  for (const p of alese) {
    const tarif = p.pricePerArticle as number;
    // Optiunile: doar cele pe care publicatia chiar le ofera, la pretul ei de azi.
    const oferite = new Map(citesteOptiuni(p.extraOptions).map((o) => [o.key, o.pret]));
    const opt = (d.optiuni?.[p.id] || [])
      .filter((k) => oferite.has(k))
      .map((k) => ({ key: k, pret: oferite.get(k)!, pretClient: pretOptiuneClient(oferite.get(k)!) }));
    const pretPartener = tarif + opt.reduce((s, o) => s + o.pret, 0);
    const pretClient = d.pretClientFix ?? tarif + adaos + opt.reduce((s, o) => s + o.pretClient, 0);
    totalNoua += pretClient;
    totalLor += pretPartener;

    const [rand] = await db
      .insert(placements)
      .values({
        publisherId: p.id,
        orderSubmissionId: d.orderSubmissionId || null,
        clientLabel: d.clientLabel || null,
        articleTitle: d.title,
        articleBody: d.body,
        images: JSON.stringify(d.images),
        featuredIndex: Math.min(d.featuredIndex, Math.max(0, d.images.length - 1)),
        linkNotes: d.linkNotes?.trim() || null,
        tier: p.tier || null,
        pricePartner: pretPartener,
        priceClient: pretClient,
        options: opt.length ? JSON.stringify(opt) : null,
        replacesId: d.replacesId || null,
        dofollowExpected: p.dofollowLinks !== false,
        sentAt: acum,
        deadlineRefuz,
        deadlinePublicare,
      })
      .returning({ id: placements.id });

    create.push({ id: rand.id, publicatie: p.siteName, email: p.contactEmail });

    const link = `${SITE.url}/plasare/${semneazaToken({ scope: "plasare", id: rand.id, v: 0 })}`;
    const panou = `${SITE.url}/cont-partener/${semneazaToken({ scope: "panou", id: p.id, v: p.tokenVersion ?? 0 })}`;
    const inf = p.kind === "influencer";
    const html = wrapEmail(
      inf ? "O colaborare nouă pentru tine" : "Un articol nou pentru publicarea ta",
      `
      <p>Salut,</p>
      <p>${inf ? `Ai o colaborare plătită pentru <strong>${esc(p.siteName)}</strong>: materialul clientului (brief, poze, linkuri) e în pagina de mai jos. Postarea se marchează ca publicitate.` : `Ai un articol de publicat pe <strong>${esc(p.siteName)}</strong>.`}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${kv("Titlu", esc(d.title))}
        ${opt.length ? kv("Plus", opt.map((o) => esc(etichetaOptiune(o.key))).join(", ")) : ""}
        ${kv("Îți plătim", `${pretPartener} lei`)}
        ${kv("Refuz până la", deadlineRefuz.toLocaleString("ro-RO", { dateStyle: "long", timeStyle: "short" }))}
        ${kv("Publicare până la", deadlinePublicare.toLocaleString("ro-RO", { dateStyle: "long", timeStyle: "short" }))}
      </table>
      <p>${inf ? "Deschide materialul, citește-l și decide:" : "Deschide articolul, citește-l și decide:"}</p>
      <p style="margin:20px 0;">
        <a href="${link}" style="background:#C8102E;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">${inf ? "Vezi materialul" : "Vezi articolul"}</a>
      </p>
      <p style="color:#64748b;font-size:13px;">
        Îl poți refuza în ${ZILE_REFUZ} zile lucrătoare, fără să explici de ce.
        Dacă îl publici, lipești adresa articolului în aceeași pagină; el rămâne
        online ${LUNI_ONLINE} luni, cu linkurile neatinse.
        Ai ${ZILE_PUBLICARE} zile lucrătoare pentru publicare; după termen, articolul trece automat
        la altă publicație, fără plată (<a href="${SITE.url}/termeni-parteneri">acordul de colaborare</a>).
      </p>
      <p style="color:#64748b;font-size:13px;">
        Toate articolele și banii tăi, într-un loc: <a href="${panou}">contul de partener</a>.
      </p>
      `,
    );
    await sendEmail({ to: p.contactEmail, subject: inf ? `Colaborare nouă — ${p.siteName}` : `Articol de publicat — ${p.siteName}`, html, replyTo: ADMIN_EMAIL }).catch(
      (e) => console.error("[trimite-plasari] email partener:", e),
    );
  }

  if (!d.faraRezumat) await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Plasări trimise — ${alese.length} ${alese.length === 1 ? "publicație" : "publicații"}`,
    html: wrapEmail(
      "Plasări trimise",
      `<p>${esc(d.title)}</p>
       <table style="width:100%;border-collapse:collapse;">
         ${kv("Publicații", alese.map((p) => esc(p.siteName)).join(", "))}
         ${kv("Încasăm", `${totalNoua} lei`)}
         ${kv("Plătim", `${totalLor} lei`)}
         ${kv("Marjă", `${totalNoua - totalLor} lei`)}
       </table>`,
    ),
  }).catch(() => {});

  return { ok: true, plasari: create, totalNoua, totalLor };
}
