/**
 * Legatura cu platforma de publicare (Reteaua Expres).
 *
 * Comenzile intra aici (MediaExpres: plata, factura, materiale), dar
 * articolele se publica DINCOLO, in aplicatia retelei, unde fiecare campanie
 * are un token si o pagina publica /raport/<token>. Pana acum, ca sa afli
 * unde a ajuns o campanie, deschideai a doua aplicatie si cautai clientul cu
 * ochii. Aici, pagina comenzii intreaba reteaua direct: cate ziare au
 * publicat, cand a iesit ultimul, si linkul raportului, gata de trimis.
 *
 * Potrivirea: intai dupa `comanda_externa` din retea = referinta comenzii de
 * aici (cs_... / op_... / man_...), apoi, ca rezerva, dupa emailul
 * clientului (cea mai noua campanie). Cand campania se creeaza in retea cu
 * referinta din MediaExpres, potrivirea e exacta; fara ea, e dupa email.
 *
 * Configurare (Railway, MediaExpres):
 *   RETEA_URL = https://botosaniexpres.ro   (aplicatia retelei)
 *   RETEA_KEY = valoarea CRON_SECRET din aplicatia retelei
 * Fara RETEA_KEY, functia intoarce `neconfigurat` si pagina spune asta,
 * nu cade.
 */

export const RETEA_URL = (process.env.RETEA_URL || "https://botosaniexpres.ro").replace(/\/$/, "");

export interface CampanieRetea {
  id: number;
  client: string;
  email: string | null;
  stare: string;
  token: string | null;
  /** Pagina publica a raportului, fara parola. Null pana la primul articol. */
  raportUrl: string | null;
  /** Cate ziare au primit articol (inclusiv programate). */
  articole: number;
  /** Cate sunt deja live. */
  articoleLive: number;
  ultimulLa: string | null;
  creataLa: string | null;
  comandaExterna: string | null;
  /** Cum a fost gasita: dupa referinta (exact) sau dupa email (probabil). */
  potrivire: "referinta" | "email";
}

interface RandRetea {
  id: number;
  client: string;
  email: string | null;
  stare: string;
  token: string | null;
  articole: number;
  articole_live: number;
  ultimul_la: string | null;
  creata_la: string | null;
  comanda_externa: string | null;
}

export type RezultatRetea =
  | { stare: "gasita"; campanie: CampanieRetea }
  | { stare: "negasita" }
  | { stare: "neconfigurat" }
  | { stare: "eroare"; mesaj: string };

/**
 * 05.10.2026 — proprietarul: „linkul de raport il creezi cu adresa domeniului
 * ales pentru promovare pe Facebook; daca e Bucuresti, pui bucurestiexpres".
 * Raportul e aceeasi pagina pe orice ziar din retea (aceeasi aplicatie), deci
 * clientul il primeste pe ziarul lui, nu pe Botosani. Fara ziar ales sau cu
 * un nume necunoscut, ramane RETEA_URL.
 */
export function domeniulRaportului(ziarPromovare: string | null | undefined): string {
  const cautat = (ziarPromovare || "").trim().toLowerCase();
  if (!cautat) return RETEA_URL;
  const norm = (t: string) => t.toLowerCase().replace(/[ăâ]/g, "a").replace(/î/g, "i").replace(/[șş]/g, "s").replace(/[țţ]/g, "t");
  const z = NEWSPAPERS.find((n) => norm(n.name) === norm(cautat)) || NEWSPAPERS.find((n) => norm(cautat).includes(norm(n.name)) || norm(n.name).includes(norm(cautat)));
  return z ? z.url.replace(/\/$/, "") : RETEA_URL;
}

function transforma(r: RandRetea, potrivire: "referinta" | "email", ziarPromovare?: string | null): CampanieRetea {
  return {
    id: r.id,
    client: r.client,
    email: r.email,
    stare: r.stare,
    token: r.token,
    raportUrl: r.token ? `${domeniulRaportului(ziarPromovare)}/raport/${r.token}` : null,
    articole: Number(r.articole || 0),
    articoleLive: Number(r.articole_live || 0),
    ultimulLa: r.ultimul_la,
    creataLa: r.creata_la,
    comandaExterna: r.comanda_externa,
    potrivire,
  };
}

/** Toate campaniile din retea, cele mai noi intai. Null = nu s-a putut citi. */
export async function campaniileDinRetea(): Promise<RandRetea[] | null> {
  const key = process.env.RETEA_KEY;
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${RETEA_URL}/api/admin/comenzi`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; comenzi?: RandRetea[] };
    return json.comenzi || [];
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Campania din retea pentru o comanda de aici. */
export async function campaniaPentruComanda(
  reference: string | null | undefined,
  email: string | null | undefined,
  /** Ziarul ales de client pentru promovarea pe Facebook: raportul se da pe domeniul lui. */
  ziarPromovare?: string | null,
): Promise<RezultatRetea> {
  if (!process.env.RETEA_KEY) return { stare: "neconfigurat" };
  const toate = await campaniileDinRetea();
  if (!toate) return { stare: "eroare", mesaj: "reteaua nu a raspuns" };

  if (reference) {
    const exact = toate.find((c) => c.comanda_externa && c.comanda_externa === reference);
    if (exact) return { stare: "gasita", campanie: transforma(exact, "referinta", ziarPromovare) };
  }
  const e = (email || "").trim().toLowerCase();
  if (e) {
    const dupaEmail = toate
      .filter((c) => (c.email || "").trim().toLowerCase() === e)
      .sort((a, b) => (b.creata_la || "").localeCompare(a.creata_la || ""));
    if (dupaEmail[0]) return { stare: "gasita", campanie: transforma(dupaEmail[0], "email", ziarPromovare) };
  }
  return { stare: "negasita" };
}

/** Eticheta starii din retea, pe intelesul nostru. */
export function etichetaStareRetea(stare: string): string {
  switch (stare) {
    case "noua":
      return "creată, fără material";
    case "material":
      return "cu material, nepublicată";
    case "publicata":
      return "în publicare / publicată";
    case "raportata":
      return "raport trimis";
    default:
      return stare;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 04.10.2026 — COMANDA PLEACA SINGURA IN RETEA.
//
// Proprietarul: „sa ne conectam direct la articolul pus aici, sa le trimiti la
// comenzi pe reteaua mea, cu toate setarile de acolo, cu ritmul de publicare,
// cu tot; sa le lasi in draft, sa le verific si dupa aia". Pana acum copia de
// mana textul, pozele si setarile din admin in /admin/comenzi din retea.
//
// Acum: la trimiterea articolului (card) si la confirmarea platii (OP),
// comanda se creeaza in retea prin POST /api/admin/comenzi, cu `comanda_externa`
// = referinta de aici (asa se leaga singura cu „Campania in retea" de mai sus),
// textul gata formatat cu linkurile pe cuvinte, pozele, text identic / unic,
// promovarea pe Facebook si, in observatii, ritmul cerut si restul. Intra ca
// „material primit", NEPUBLICATA: publicarea o porneste proprietarul din
// retea, unde alege esalonarea (12 ore / 3 zile / 2 saptamani) dupa observatii.
// ─────────────────────────────────────────────────────────────────────────────

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions, orders } from "@/db/schema";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { articolHtml } from "@/lib/articol-html";
import { ritmDupaId } from "@/lib/ritm";
import { etichetaSursa } from "@/lib/sursa";
import { findPackageById } from "@/data/packages";
import { NEWSPAPERS } from "@/data/newspapers";

export interface ComandaPentruRetea {
  comanda_externa: string;
  id?: number;
  client: string;
  email: string | null;
  telefon: string | null;
  link_client: string;
  pachet: string;
  pret: number | null;
  moneda: "RON";
  platit: boolean;
  titlu: string;
  material: string;
  poze: string[];
  observatii: string;
  text_identic: boolean;
  promovare_zile: number | null;
  promovare_public: string | null;
  categorie: "Publicitate";
}

type RandComanda = typeof orderSubmissions.$inferSelect;

function adresaCurata(u: string | null | undefined): string | null {
  const t = (u || "").trim();
  if (!t) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return /\./.test(url.hostname) ? url.toString().replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}

/** Ce trimitem, construit din comanda de aici. Exportat pentru teste. */
export function comandaPentruRetea(r: RandComanda, extra: { pretLei: number | null; reteaId?: number | null }): ComandaPentruRetea | { eroare: string } {
  const link = adresaCurata(r.siteUrl);
  if (!link) return { eroare: "comanda nu are site-ul clientului; reteaua cere linkul clientului" };

  let poze: { url: string; capturaSite?: boolean }[] = [];
  try {
    poze = JSON.parse(r.images || "[]");
  } catch {
    poze = [];
  }
  // Poza reprezentativa prima: in retea, prima poza e cea principala.
  const idx = Math.min(Math.max(r.featuredIndex ?? 0, 0), Math.max(poze.length - 1, 0));
  const ordonate = poze.length ? [poze[idx], ...poze.filter((_, i) => i !== idx)] : [];

  const ritm = ritmDupaId(r.ritm);
  const { html, negasite } = articolHtml({ titlu: r.title, corp: r.body, linkNotes: r.linkNotes, dofollow: true });

  const obs = [
    `Comandă MediaExpres ${r.stripeSessionId} (${etichetaSursa(r.source)}), ${r.paymentMethod === "op" ? "plată prin transfer" : "plată cu cardul"}.`,
    r.ziareAlese ? `ZIARE: ${r.ziareAlese} — pachetul ${findPackageById(r.packageId)?.name || r.packageId}, ${findPackageById(r.packageId)?.newspapers ?? "?"} ziare.` : "",
    `RITM CERUT: ${ritm.eticheta} → eșalonare ${ritm.ore} ore.`,
    r.uniquePerSite ? "TEXT: variantă unică pe fiecare ziar (rescriere)." : "TEXT: IDENTIC pe toate ziarele, cerut de client — fără rescriere.",
    r.facebookOptIn
      ? `PROMOVARE FACEBOOK 3 zile pe: ${r.fbBoostPaper?.trim() || "ziarul din județul clientului (n-a ales)"}.`
      : "Fără postare pe Facebook (clientul a debifat).",
    r.linkNotes?.trim() ? `LINKURI CERUTE (deja puse pe cuvinte în text):\n${r.linkNotes.trim()}` : "LINKURI: numele firmei → site, pus automat.",
    negasite.length ? `ATENȚIE: ancore negăsite în text: ${negasite.map((l) => `${l.ancora || "?"} → ${l.url}`).join("; ")}` : "",
    r.keywords ? `Cuvinte cheie: ${r.keywords}` : "",
    r.metaDescription ? `Meta description: ${r.metaDescription}` : "",
    r.generatedByAi ? "Textul a fost scris cu AI pe mediaexpress.ro, aprobat de client." : "",
    poze[0]?.capturaSite ? "POZE: clientul n-a trimis poze; prima poză e o captură a site-ului lui." : "",
    r.isCasino ? "⚠️ CAZINO / jocuri de noroc." : "",
    [r.companyCui || r.cui ? `CUI ${r.companyCui || r.cui}` : "", r.companyAddress || r.billingAddress || ""].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    comanda_externa: r.stripeSessionId,
    ...(extra.reteaId ? { id: extra.reteaId } : {}),
    client: (r.companyName || "").trim() || r.email,
    email: r.email,
    telefon: r.contactPhone || null,
    link_client: link,
    pachet: findPackageById(r.packageId)?.name || r.packageId,
    pret: extra.pretLei,
    moneda: "RON",
    platit: r.status === "paid" || r.status === "published" || (r.paymentMethod !== "op" && r.status !== "pending_payment"),
    titlu: r.title,
    material: html,
    poze: ordonate.map((p) => p.url).filter(Boolean),
    observatii: obs,
    text_identic: !r.uniquePerSite,
    promovare_zile: r.facebookOptIn ? 3 : null,
    promovare_public: r.facebookOptIn ? `${r.fbBoostPaper?.trim() || "ziarul din județul clientului"} — 3 zile, inclusă în preț` : null,
    categorie: "Publicitate",
  };
}

export type RezultatTrimitere = { ok: true; id: number; actualizata: boolean } | { ok: false; motiv: string };

/** Trimite (sau retrimite) o comanda de aici in reteaua de publicare. */
export async function trimiteComandaInRetea(submissionId: string): Promise<RezultatTrimitere> {
  const key = process.env.RETEA_KEY;
  if (!key) return { ok: false, motiv: "RETEA_KEY lipsește în Railway (valoarea CRON_SECRET din rețea)" };
  await ensureOrderColumns();
  const [r] = await db.select().from(orderSubmissions).where(eq(orderSubmissions.id, submissionId)).limit(1);
  if (!r) return { ok: false, motiv: "comanda nu există" };

  let pretLei: number | null = null;
  try {
    const [o] = await db.select({ amount: orders.amount }).from(orders).where(eq(orders.stripeSessionId, r.stripeSessionId)).limit(1);
    if (o?.amount) pretLei = Math.round(o.amount / 100);
  } catch {
    /* fara pret, nu e grav */
  }
  if (pretLei == null) {
    pretLei = findPackageById(r.packageId)?.price ?? null;
  }

  const corp = comandaPentruRetea(r, { pretLei, reteaId: r.reteaId });
  if ("eroare" in corp) {
    await db.update(orderSubmissions).set({ reteaEroare: corp.eroare }).where(eq(orderSubmissions.id, r.id));
    return { ok: false, motiv: corp.eroare };
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`${RETEA_URL}/api/admin/comenzi?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(corp),
      signal: ctrl.signal,
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: number; actualizata?: boolean; error?: string };
    if (!res.ok || !j.ok || !j.id) {
      const motiv = j.error || `rețeaua a răspuns ${res.status}`;
      await db.update(orderSubmissions).set({ reteaEroare: motiv.slice(0, 300) }).where(eq(orderSubmissions.id, r.id));
      return { ok: false, motiv };
    }
    await db
      .update(orderSubmissions)
      .set({ reteaId: j.id, reteaTrimisLa: new Date(), reteaEroare: null })
      .where(eq(orderSubmissions.id, r.id));
    console.log(`[retea] comanda ${r.stripeSessionId} → rețea #${j.id}${j.actualizata ? " (actualizată)" : ""}`);
    return { ok: true, id: j.id, actualizata: Boolean(j.actualizata) };
  } catch (e) {
    const motiv = e instanceof Error ? e.message : String(e);
    await db.update(orderSubmissions).set({ reteaEroare: motiv.slice(0, 300) }).where(eq(orderSubmissions.id, r.id));
    return { ok: false, motiv };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Trimiterea automata: doar comenzile platite, fara cazino (alea le vede un
 * om intai). Nu arunca niciodata — comanda de aici e deja salvata.
 */
export async function trimiteAutomatInRetea(submissionId: string, motivApel: string): Promise<void> {
  try {
    const [r] = await db
      .select({ status: orderSubmissions.status, isCasino: orderSubmissions.isCasino, paymentMethod: orderSubmissions.paymentMethod })
      .from(orderSubmissions)
      .where(eq(orderSubmissions.id, submissionId))
      .limit(1);
    if (!r) return;
    if (r.isCasino) return;
    if (r.paymentMethod === "op" && r.status === "pending_payment") return;
    const rez = await trimiteComandaInRetea(submissionId);
    if (!rez.ok) console.warn(`[retea] ${motivApel}: ${rez.motiv}`);
  } catch (e) {
    console.error("[retea] trimitere automata:", e instanceof Error ? e.message : e);
  }
}
