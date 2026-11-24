import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { SITE } from "@/data/site";

/**
 * 23.11.2026 (owner: „postam articolele de pe blog pe LinkedIn, automat").
 * Aplicatia LinkedIn „MediaExpres Blog" (LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET).
 * Adminul se conecteaza o data la /api/linkedin/connect; tokenul (2 luni) sta in
 * app_setting „linkedin". Se posteaza pe pagina firmei cand exista
 * LINKEDIN_ORG_ID si aprobarea Community Management API, altfel pe profilul
 * celui care s-a conectat. Oprire: LINKEDIN_POSTARE=0.
 */
const CHEIE = "linkedin";
const VERSIUNE = process.env.LINKEDIN_VERSION || "202411";
export const LINKEDIN_REDIRECT = `${SITE.url}/api/linkedin/callback`;

type StareLinkedIn = { token: string; expira: number; persoana: string | null; nume?: string | null };

export function scopuriLinkedIn(): string {
  return process.env.LINKEDIN_SCOPES || "openid profile w_member_social w_organization_social";
}

export function urlConectare(state: string): string | null {
  const id = process.env.LINKEDIN_CLIENT_ID;
  if (!id) return null;
  const q = new URLSearchParams({
    response_type: "code",
    client_id: id,
    redirect_uri: LINKEDIN_REDIRECT,
    state,
    scope: scopuriLinkedIn(),
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${q}`;
}

async function citeste(): Promise<StareLinkedIn | null> {
  const [r] = await db.select().from(appSettings).where(eq(appSettings.key, CHEIE)).limit(1);
  if (!r) return null;
  try {
    return JSON.parse(r.value) as StareLinkedIn;
  } catch {
    return null;
  }
}

async function scrie(s: StareLinkedIn): Promise<void> {
  const v = JSON.stringify(s);
  await db
    .insert(appSettings)
    .values({ key: CHEIE, value: v, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: v, updatedAt: new Date() } });
}

/** Schimba codul primit de la LinkedIn pe token si afla cine s-a conectat. */
export async function finalizeazaConectarea(code: string): Promise<{ ok: boolean; motiv?: string; nume?: string | null }> {
  const id = process.env.LINKEDIN_CLIENT_ID;
  const secret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!id || !secret) return { ok: false, motiv: "LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET lipsesc pe server" };
  const r = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: LINKEDIN_REDIRECT,
      client_id: id,
      client_secret: secret,
    }),
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!r.ok || !j.access_token) return { ok: false, motiv: j.error_description || `LinkedIn ${r.status}` };
  let persoana: string | null = null;
  let nume: string | null = null;
  try {
    const u = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { authorization: `Bearer ${j.access_token}` } });
    if (u.ok) {
      const ui = (await u.json()) as { sub?: string; name?: string };
      persoana = ui.sub ? `urn:li:person:${ui.sub}` : null;
      nume = ui.name || null;
    }
  } catch {
    /* fara persoana: se poate posta doar pe pagina firmei */
  }
  await scrie({ token: j.access_token, expira: Date.now() + (j.expires_in || 5184000) * 1000, persoana, nume });
  return { ok: true, nume };
}

export async function stareLinkedIn(): Promise<{ conectat: boolean; expira?: string; nume?: string | null; tinta: string | null }> {
  const s = await citeste();
  const org = process.env.LINKEDIN_ORG_ID;
  const tinta = org ? `urn:li:organization:${org}` : s?.persoana || null;
  if (!s || s.expira < Date.now()) return { conectat: false, tinta };
  return { conectat: true, expira: new Date(s.expira).toISOString(), nume: s.nume, tinta };
}

/** Textul postarii pe LinkedIn: titlul, ideea, linkul, cateva hashtag-uri. */
export function textLinkedIn(p: { title: string; excerpt: string; slug: string }): string {
  return `${p.title}\n\n${p.excerpt}\n\nArticolul complet: ${SITE.url}/blog/${p.slug}\n\n#PR #marketing #comunicatdepresa #advertorial #SEO`;
}

export async function posteazaPeLinkedIn(d: {
  text: string;
  link: string;
  titlu: string;
  descriere?: string;
}): Promise<{ ok: true; id: string } | { ok: false; motiv: string }> {
  if (process.env.LINKEDIN_POSTARE === "0") return { ok: false, motiv: "oprit (LINKEDIN_POSTARE=0)" };
  const s = await citeste();
  if (!s) return { ok: false, motiv: "LinkedIn neconectat — /api/linkedin/connect" };
  if (s.expira < Date.now()) return { ok: false, motiv: "tokenul LinkedIn a expirat — reconectare la /api/linkedin/connect" };
  const org = process.env.LINKEDIN_ORG_ID;
  const autor = org ? `urn:li:organization:${org}` : s.persoana;
  if (!autor) return { ok: false, motiv: "nu stiu pe ce cont sa postez (lipsesc LINKEDIN_ORG_ID si profilul)" };
  const r = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      authorization: `Bearer ${s.token}`,
      "content-type": "application/json",
      "LinkedIn-Version": VERSIUNE,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: autor,
      // „little text": caracterele rezervate se scapa, altfel LinkedIn respinge postarea.
      commentary: d.text.replace(/[\\|{}@\[\]()<>#*_~]/g, (c) => `\\${c}`),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { article: { source: d.link, title: d.titlu.slice(0, 200), description: (d.descriere || "").slice(0, 250) } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) return { ok: false, motiv: `LinkedIn ${r.status}: ${(await r.text()).slice(0, 300)}` };
  return { ok: true, id: r.headers.get("x-restli-id") || r.headers.get("x-linkedin-id") || "ok" };
}

// ───────────── automat: un articol de blog pe zi, cele noi primele ─────────────
const POSTATE = "linkedin_postate";

async function listaPostate(): Promise<{ slugs: string[]; ultima: number }> {
  const [r] = await db.select().from(appSettings).where(eq(appSettings.key, POSTATE)).limit(1);
  try {
    return r ? (JSON.parse(r.value) as { slugs: string[]; ultima: number }) : { slugs: [], ultima: 0 };
  } catch {
    return { slugs: [], ultima: 0 };
  }
}

async function noteazaPostat(slug: string): Promise<void> {
  const l = await listaPostate();
  const v = JSON.stringify({ slugs: [...l.slugs, slug].slice(-1000), ultima: Date.now() });
  await db
    .insert(appSettings)
    .values({ key: POSTATE, value: v, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: v, updatedAt: new Date() } });
}

/**
 * Posteaza pe LinkedIn cel mai nou articol de blog inca nepostat, cel mult unul
 * la LINKEDIN_ORE_INTRE (22) ore, intre 08 si 19 ora Romaniei. Asa intra si
 * articolele vechi, pe rand, fara sa arate a spam.
 */
export async function posteazaUrmatorulPeLinkedIn(
  posturi: { slug: string; title: string; excerpt: string }[],
  opt: { fortat?: boolean; slug?: string } = {},
): Promise<{ postat?: string; motiv?: string }> {
  const l = await listaPostate();
  const ore = Number(process.env.LINKEDIN_ORE_INTRE || 22);
  const oraRo = Number(new Intl.DateTimeFormat("ro-RO", { hour: "numeric", hour12: false, timeZone: "Europe/Bucharest" }).format(new Date()));
  if (!opt.fortat && (oraRo < 8 || oraRo >= 19)) return { motiv: "in afara orelor 08-19" };
  if (!opt.fortat && Date.now() - l.ultima < ore * 3600_000) return { motiv: `ultima postare acum mai putin de ${ore}h` };
  const p = opt.slug ? posturi.find((x) => x.slug === opt.slug) : posturi.find((x) => !l.slugs.includes(x.slug));
  if (!p) return { motiv: "nu mai sunt articole nepostate" };
  const r = await posteazaPeLinkedIn({
    text: textLinkedIn(p),
    link: `${SITE.url}/blog/${p.slug}`,
    titlu: p.title,
    descriere: p.excerpt,
  });
  if (!r.ok) return { motiv: r.motiv };
  await noteazaPostat(p.slug);
  return { postat: p.slug };
}

// ───────────── Oferta 500, o data la LINKEDIN_OFERTA_ZILE (2) zile, text diferit de fiecare data ─────────────
const OFERTA = "linkedin_oferta";

const LINK_OFERTA = `${SITE.url}/oferta-500?utm_source=linkedin&utm_medium=social&utm_campaign=oferta500`;

/** Textele ofertei, pe rand — de fiecare data alt unghi, aceleasi fapte. */
export const TEXTE_OFERTA_LINKEDIN: string[] = [
  `Articolul firmei tale în 50 de ziare românești, 500 de lei, o singură plată.

✓ 41 de ziare locale și 9 naționale
✓ Publicare în maximum 12 ore lucrătoare
✓ Raport cu toate linkurile, urmărit în timp real
✓ Factură pe firmă, plată cu cardul sau prin OP

Detalii și comandă: ${LINK_OFERTA}`,
  `Când un client îți caută firma pe Google, ce găsește?

Un articol despre afacerea ta, publicat în 50 de ziare din toată țara, schimbă prima impresie. Oamenii au încredere în ce scrie presa.

500 de lei, o singură plată, publicare în 12 ore lucrătoare și raport cu toate linkurile.

${LINK_OFERTA}`,
  `Un singur articol sau 50?

Un articol într-un singur ziar e citit o zi. Același articol în 50 de ziare locale și naționale ajunge la cititori din toate regiunile și rămâne online, cu link spre site-ul tău.

Oferta MediaExpres: 500 de lei pentru toate cele 50 de ziare.
${LINK_OFERTA}`,
  `Ai o noutate în firmă? Un produs nou, o deschidere, o colaborare?

Trimite-ne textul (sau te ajutăm noi să-l scriem), iar în maximum 12 ore lucrătoare apare în 50 de ziare românești. Primești raportul cu fiecare link, iar factura e pe firma ta.

500 de lei, totul inclus: ${LINK_OFERTA}`,
  `Pentru firmele din județe: apari în ziarul local al orașului tău și, în aceeași zi, în ziarele din toată țara.

41 de ziare județene + 9 naționale, un singur articol, 500 de lei.
Linkurile rămân online permanent.

Comandă aici: ${LINK_OFERTA}`,
];

/** In ziua ofertei se posteaza oferta, nu un articol (o singura postare pe zi). */
export async function posteazaOfertaPeLinkedIn(opt: { fortat?: boolean } = {}): Promise<{ postat?: boolean; motiv?: string }> {
  const zile = Number(process.env.LINKEDIN_OFERTA_ZILE || 2);
  const [r] = await db.select().from(appSettings).where(eq(appSettings.key, OFERTA)).limit(1);
  const ultima = r ? Number(r.value) || 0 : 0;
  if (!opt.fortat && Date.now() - ultima < zile * 86400_000) return { motiv: `oferta postata acum mai putin de ${zile} zile` };
  const l = await listaPostate();
  const ore = Number(process.env.LINKEDIN_ORE_INTRE || 22);
  if (!opt.fortat && Date.now() - l.ultima < ore * 3600_000) return { motiv: "azi s-a postat deja" };
  const nr = Math.floor(ultima / 1000) % 1000; // indexul variantei e tinut in milisecundele ultimei postari
  const urm = r ? (nr + 1) % TEXTE_OFERTA_LINKEDIN.length : 0;
  const p = await posteazaPeLinkedIn({
    text: TEXTE_OFERTA_LINKEDIN[urm],
    link: LINK_OFERTA,
    titlu: "Articolul tău în 50 de ziare românești — 500 lei",
    descriere: "Publicare în 12 ore lucrătoare, raport cu toate linkurile, factură pe firmă.",
  });
  if (!p.ok) return { motiv: p.motiv };
  const v = String(Math.floor(Date.now() / 1_000_000) * 1_000_000 + urm * 1000);
  await db
    .insert(appSettings)
    .values({ key: OFERTA, value: v, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: v, updatedAt: new Date() } });
  // conteaza si ca postarea zilei, ca articolul sa astepte pana maine
  const lp = await listaPostate();
  const vv = JSON.stringify({ slugs: lp.slugs, ultima: Date.now() });
  await db
    .insert(appSettings)
    .values({ key: POSTATE, value: vv, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: vv, updatedAt: new Date() } });
  return { postat: true };
}

/** Cate ore au trecut de la ultima postare automata pe LinkedIn (articol sau oferta). */
export async function oreDeLaUltimaPostare(): Promise<number> {
  const l = await listaPostate();
  return l.ultima ? (Date.now() - l.ultima) / 3600_000 : 999;
}
