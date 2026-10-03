import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, blogKeywords, blogPosts } from "@/db/schema";
import { ensureBlogTables } from "@/lib/ensure-columns";
import { getCloudinaryConfig, signUploadParams } from "@/lib/cloudinary";
import { SITE } from "@/data/site";

/**
 * Autoblogul (03.10.2026).
 *
 * Proprietarul: „hai sa facem si un autoblog... sa fie indexate articolele,
 * poze de la Pixabay sau Pexels, distribuim pe Facebook, ritm 1 pe zi, 2,
 * 1 la 2 zile, pe cuvinte cheie, sa crestem". Un client (Cochlear, 1.500 lei)
 * a venit din cautare organica — de aici ideea.
 *
 * Cum merge: adminul pune o lista de cuvinte cheie si un ritm. Cronul
 * (/api/cron/autoblog, la 30 de minute) ia urmatorul cuvant cand i-a venit
 * randul, cere modelului un articol de ghid (nu reclama), ii cauta o poza,
 * il publica pe /blog/[slug] si il posteaza pe pagina de Facebook daca
 * exista token de pagina. Totul se vede si se poate sterge din
 * /admin/autoblog.
 */

export const RITMURI_BLOG = [
  { id: "2pezi", eticheta: "2 pe zi", oreIntre: 12 },
  { id: "1pezi", eticheta: "1 pe zi", oreIntre: 24 },
  { id: "la2zile", eticheta: "1 la 2 zile", oreIntre: 48 },
  { id: "la3zile", eticheta: "1 la 3 zile", oreIntre: 72 },
] as const;
export type RitmBlogId = (typeof RITMURI_BLOG)[number]["id"];

/** Publicam doar ziua, ora Romaniei: un blog care posteaza la 3 noaptea arata a robot. */
export const ORA_START = 8;
export const ORA_STOP = 21;

export interface SetariAutoblog {
  activ: boolean;
  ritm: RitmBlogId;
  facebook: boolean;
}

const SETARI_IMPLICITE: SetariAutoblog = { activ: false, ritm: "1pezi", facebook: true };

/** Paginile interne pe care modelul are voie sa le lege din articol. */
export const PAGINI_INTERNE = [
  { cale: "/oferta-500", ce: "oferta: advertorial publicat in 50 de ziare online din Romania, 500 lei, cu promovare pe Facebook inclusa" },
  { cale: "/reteaua-noastra", ce: "lista celor 50 de ziare din retea, cu scorurile DA/PA" },
  { cale: "/alege-ziarele", ce: "catalogul de publicatii partenere si influenceri, unde clientul alege unde sa publice" },
  { cale: "/generator-comunicat", ce: "generator gratuit de comunicate de presa" },
  { cale: "/pachete", ce: "pachetele si preturile" },
  { cale: "/blog", ce: "blogul MediaExpres, ghiduri despre PR si presa online" },
] as const;

// ───────────────────────── Setari ─────────────────────────

export async function citesteSetariAutoblog(): Promise<SetariAutoblog> {
  await ensureBlogTables();
  const [r] = await db.select().from(appSettings).where(eq(appSettings.key, "autoblog")).limit(1);
  if (!r) return SETARI_IMPLICITE;
  try {
    const j = JSON.parse(r.value) as Partial<SetariAutoblog>;
    return {
      activ: Boolean(j.activ),
      ritm: RITMURI_BLOG.some((x) => x.id === j.ritm) ? (j.ritm as RitmBlogId) : "1pezi",
      facebook: j.facebook !== false,
    };
  } catch {
    return SETARI_IMPLICITE;
  }
}

export async function salveazaSetariAutoblog(s: SetariAutoblog): Promise<void> {
  await ensureBlogTables();
  await db
    .insert(appSettings)
    .values({ key: "autoblog", value: JSON.stringify(s), updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(s), updatedAt: new Date() } });
}

// ───────────────────────── Cuvinte cheie ─────────────────────────

/** O linie sau o virgula = un cuvant cheie. Fara dubluri, fara goale. */
export function parseazaCuvinte(text: string): string[] {
  const vazute = new Set<string>();
  const out: string[] = [];
  for (const bucata of text.split(/[\n,;]+/)) {
    const c = bucata.replace(/\s+/g, " ").trim().replace(/^[-•*\d.)\s]+/, "").trim();
    if (c.length < 3 || c.length > 120) continue;
    const k = c.toLowerCase();
    if (vazute.has(k)) continue;
    vazute.add(k);
    out.push(c);
  }
  return out;
}

export async function adaugaCuvinte(text: string): Promise<number> {
  await ensureBlogTables();
  const noi = parseazaCuvinte(text);
  if (!noi.length) return 0;
  const existente = await db.select({ keyword: blogKeywords.keyword }).from(blogKeywords);
  const deja = new Set(existente.map((x) => x.keyword.toLowerCase()));
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${blogKeywords.position}), 0)::int` }).from(blogKeywords);
  let poz = max;
  const deInserat = noi.filter((c) => !deja.has(c.toLowerCase())).map((keyword) => ({ keyword, position: ++poz }));
  if (deInserat.length) await db.insert(blogKeywords).values(deInserat);
  return deInserat.length;
}

export async function stergeCuvant(id: string): Promise<void> {
  await ensureBlogTables();
  await db.delete(blogKeywords).where(eq(blogKeywords.id, id));
}

export async function listeazaCuvinte() {
  await ensureBlogTables();
  return db.select().from(blogKeywords).orderBy(asc(blogKeywords.position), asc(blogKeywords.createdAt));
}

// ───────────────────────── Text ─────────────────────────

export function slugDin(text: string): string {
  const fara = text
    .toLowerCase()
    .replace(/[ăâ]/g, "a")
    .replace(/[î]/g, "i")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return fara
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

const TAGURI_PERMISE = new Set(["p", "h2", "h3", "ul", "ol", "li", "strong", "em", "a", "blockquote", "br"]);

/**
 * Pastram doar tagurile de text si doar linkuri interne (relative sau catre
 * site-ul nostru). Modelul n-are voie sa puna linkuri externe: un blog care
 * trimite la site-uri straine la intamplare e exact ce nu vrem.
 */
export function curataHtml(html: string): string {
  const site = SITE.url.replace(/\/$/, "");
  return html
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Un <h1> in corp ar concura cu titlul paginii: devine <h2>.
    .replace(/<(\/?)h1\b[^>]*>/gi, "<$1h2>")
    // Linkurile, pereche cu pereche: cele externe raman doar text.
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (m, atribute: string, inner: string) => {
      const href = (atribute.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1] || "";
      const h = href.trim().replace(new RegExp(`^${site.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "");
      return /^\/[a-z0-9\-/]*(#[a-z0-9-]*)?$/i.test(h) ? `<a href="${h}">${inner}</a>` : inner;
    })
    .replace(/<\s*(\/?)\s*([a-z0-9]+)([^>]*)>/gi, (m, inchis: string, tag: string, atribute: string) => {
      const t = tag.toLowerCase();
      if (!TAGURI_PERMISE.has(t)) return "";
      if (inchis) return `</${t}>`;
      if (t === "a") {
        const href = (atribute.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1] || "";
        const h = href.trim().replace(new RegExp(`^${site.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "");
        if (!/^\/[a-z0-9\-/]*(#[a-z0-9-]*)?$/i.test(h)) return "";
        return `<a href="${h}">`;
      }
      return `<${t}>`;
    })
    .replace(/<a>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function numarCuvinte(html: string): number {
  const t = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t ? t.split(" ").length : 0;
}

export interface ArticolGenerat {
  title: string;
  excerpt: string;
  html: string;
  tags: string[];
  imageQuery: string;
}

export async function genereazaArticolBlog(keyword: string, titluriExistente: string[]): Promise<ArticolGenerat> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY lipseste");

  const system = `Esti redactorul blogului MediaExpres (${SITE.url}), un serviciu din Romania care publica advertoriale si comunicate de presa in 50 de ziare online locale si nationale. Scrii ghiduri utile, in romana corecta cu diacritice, pentru antreprenori si firme mici care vor sa apara in presa si pe Google.

Reguli:
- Articolul raspunde la intentia de cautare a cuvantului cheie, concret si practic: pasi, exemple, cifre, greseli de evitat, o sectiune de intrebari frecvente.
- 1000-1400 de cuvinte. Titlul contine cuvantul cheie, natural, sub 65 de caractere.
- HTML simplu: doar <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <a>. Fara <h1>, fara imagini, fara tabele, fara stiluri, fara markdown.
- 2-3 linkuri interne, puse natural pe cuvinte din text, DOAR catre paginile de mai jos (href relativ, exact cum e scris). Niciun link extern.
- MediaExpres se mentioneaza o singura data, in final, ca optiune, fara superlative. Restul e ghid onest, nu reclama.
- Fara promisiuni („garantat", „locul 1 in Google"), fara cifre inventate despre MediaExpres.
- Nu repeta titluri deja publicate pe blog.

Pagini interne permise:
${PAGINI_INTERNE.map((p) => `- ${p.cale} — ${p.ce}`).join("\n")}

Raspunzi STRICT cu JSON: {"title": string, "excerpt": string (1-2 propozitii, max 160 caractere, pentru meta description), "html": string, "tags": string[] (2-4 etichete scurte), "imageQuery": string (2-4 cuvinte in engleza pentru o poza stock relevanta, fara nume de firme)}.`;

  const user = `Cuvant cheie: ${keyword}
Titluri deja publicate (nu le repeta): ${titluriExistente.slice(0, 40).join(" | ") || "—"}

Scrie articolul.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 4000,
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content || "";
  let j: Partial<ArticolGenerat>;
  try {
    j = JSON.parse(raw) as Partial<ArticolGenerat>;
  } catch {
    throw new Error("Raspunsul modelului nu e JSON");
  }
  const html = curataHtml(String(j.html || ""));
  const title = String(j.title || "").trim();
  if (!title || numarCuvinte(html) < 400) throw new Error(`Articol prea scurt sau fara titlu (${numarCuvinte(html)} cuvinte)`);
  return {
    title: title.slice(0, 120),
    excerpt: String(j.excerpt || "").trim().slice(0, 200) || title,
    html,
    tags: Array.isArray(j.tags) ? j.tags.map(String).map((t) => t.trim()).filter(Boolean).slice(0, 4) : [],
    imageQuery: String(j.imageQuery || keyword).trim().slice(0, 60),
  };
}

// ───────────────────────── Poze ─────────────────────────

export interface PozaGasita {
  url: string;
  credit: string;
  sursa: "pexels" | "pixabay";
  paginaSursa?: string;
}

export async function cautaPoza(query: string): Promise<PozaGasita | null> {
  const pexels = process.env.PEXELS_API_KEY?.trim();
  if (pexels) {
    try {
      const r = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&size=large`,
        { headers: { Authorization: pexels } },
      );
      if (r.ok) {
        const j = (await r.json()) as { photos?: { src?: { large2x?: string; large?: string }; photographer?: string; url?: string }[] };
        const p = j.photos?.find((x) => x.src?.large2x || x.src?.large);
        if (p) {
          return {
            url: (p.src?.large2x || p.src?.large) as string,
            credit: `Foto: ${p.photographer || "Pexels"} / Pexels`,
            sursa: "pexels",
            paginaSursa: p.url,
          };
        }
      } else {
        console.warn("[autoblog] pexels", r.status);
      }
    } catch (e) {
      console.warn("[autoblog] pexels", e instanceof Error ? e.message : e);
    }
  }
  const pixabay = process.env.PIXABAY_API_KEY?.trim();
  if (pixabay) {
    try {
      const r = await fetch(
        `https://pixabay.com/api/?key=${encodeURIComponent(pixabay)}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=5&safesearch=true`,
      );
      if (r.ok) {
        const j = (await r.json()) as { hits?: { largeImageURL?: string; webformatURL?: string; user?: string; pageURL?: string }[] };
        const h = j.hits?.find((x) => x.largeImageURL || x.webformatURL);
        if (h) {
          return {
            url: (h.largeImageURL || h.webformatURL) as string,
            credit: `Foto: ${h.user || "Pixabay"} / Pixabay`,
            sursa: "pixabay",
            paginaSursa: h.pageURL,
          };
        }
      } else {
        console.warn("[autoblog] pixabay", r.status);
      }
    } catch (e) {
      console.warn("[autoblog] pixabay", e instanceof Error ? e.message : e);
    }
  }
  return null;
}

/**
 * Poza se copiaza la noi (Cloudinary) cand avem cheile: Pixabay nu permite
 * hotlink, iar o poza care dispare de pe Pexels ne lasa articolul fara
 * imagine. Fara Cloudinary, ramane adresa originala (merge doar la Pexels).
 */
export async function urcaInCloudinary(url: string, publicId: string): Promise<string | null> {
  const cfg = getCloudinaryConfig();
  if (!cfg) return null;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `${cfg.uploadFolder}/blog`;
  const semnat = signUploadParams({ folder, public_id: publicId, timestamp });
  if (!semnat) return null;
  const fd = new FormData();
  fd.set("file", url);
  fd.set("folder", folder);
  fd.set("public_id", publicId);
  fd.set("timestamp", String(timestamp));
  fd.set("signature", String(semnat.signature));
  fd.set("api_key", cfg.apiKey);
  try {
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, { method: "POST", body: fd });
    if (!r.ok) {
      console.warn("[autoblog] cloudinary", r.status, (await r.text()).slice(0, 200));
      return null;
    }
    const j = (await r.json()) as { secure_url?: string };
    return j.secure_url || null;
  } catch (e) {
    console.warn("[autoblog] cloudinary", e instanceof Error ? e.message : e);
    return null;
  }
}

// ───────────────────────── Facebook ─────────────────────────

/** Textul postarii: titlul, rezumatul si linkul. Fara hashtag-uri, fara emoji-uri in exces. */
export function textPostareFacebook(p: { title: string; excerpt: string; slug: string }): string {
  return `${p.title}\n\n${p.excerpt}\n\nCitește articolul: ${SITE.url}/blog/${p.slug}`;
}

export function configFacebookPagina(): { token: string; pageId: string } | null {
  const token = process.env.FB_PAGE_TOKEN?.trim();
  const pageId = process.env.FB_PAGE_ID?.trim();
  return token && pageId ? { token, pageId } : null;
}

export async function posteazaPeFacebook(postId: string): Promise<{ ok: boolean; motiv?: string }> {
  await ensureBlogTables();
  const cfg = configFacebookPagina();
  if (!cfg) return { ok: false, motiv: "Lipsesc FB_PAGE_TOKEN / FB_PAGE_ID" };
  const [p] = await db.select().from(blogPosts).where(eq(blogPosts.id, postId)).limit(1);
  if (!p) return { ok: false, motiv: "Articolul nu exista" };
  if (p.fbPostId) return { ok: true };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${cfg.pageId}/feed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: textPostareFacebook(p), link: `${SITE.url}/blog/${p.slug}`, access_token: cfg.token }),
    });
    const j = (await r.json()) as { id?: string; error?: { message?: string } };
    if (!r.ok || !j.id) {
      const motiv = j.error?.message || `Facebook ${r.status}`;
      await db.update(blogPosts).set({ fbError: motiv.slice(0, 300) }).where(eq(blogPosts.id, p.id));
      return { ok: false, motiv };
    }
    await db.update(blogPosts).set({ fbPostId: j.id, fbPostedAt: new Date(), fbError: null }).where(eq(blogPosts.id, p.id));
    return { ok: true };
  } catch (e) {
    const motiv = e instanceof Error ? e.message : String(e);
    await db.update(blogPosts).set({ fbError: motiv.slice(0, 300) }).where(eq(blogPosts.id, p.id));
    return { ok: false, motiv };
  }
}

// ───────────────────────── Publicare ─────────────────────────

export function oraRomaniei(d = new Date()): number {
  return Number(new Intl.DateTimeFormat("ro-RO", { hour: "numeric", hour12: false, timeZone: "Europe/Bucharest" }).format(d));
}

/** I-a venit randul urmatorului articol? Dupa ritm si doar in orele de zi. */
export function eRandul(d: { ritm: RitmBlogId; ultimaPublicare: Date | null; acum?: Date }): boolean {
  const acum = d.acum || new Date();
  const ora = oraRomaniei(acum);
  if (ora < ORA_START || ora >= ORA_STOP) return false;
  if (!d.ultimaPublicare) return true;
  const ore = RITMURI_BLOG.find((r) => r.id === d.ritm)?.oreIntre ?? 24;
  // Cu 30 de minute toleranta: cronul ruleaza la 30 de minute si „1 pe zi"
  // nu trebuie sa alunece spre seara cu cate o jumatate de ora pe zi.
  return acum.getTime() - d.ultimaPublicare.getTime() >= (ore - 0.5) * 60 * 60 * 1000;
}

export type RezultatPublicare =
  | { facut: false; motiv: string }
  | { facut: true; id: string; slug: string; title: string; facebook: string };

/**
 * Un articol, daca e cazul. Cu `fortat` ignora ritmul si starea „activ" (butonul
 * „Genereaza acum" din admin), dar tot are nevoie de un cuvant in asteptare.
 */
export async function publicaUrmatorul(opt: { fortat?: boolean; keywordId?: string } = {}): Promise<RezultatPublicare> {
  await ensureBlogTables();
  const setari = await citesteSetariAutoblog();
  if (!opt.fortat) {
    if (!setari.activ) return { facut: false, motiv: "autoblog oprit" };
    const [ultim] = await db
      .select({ publishedAt: blogPosts.publishedAt })
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(1);
    if (!eRandul({ ritm: setari.ritm, ultimaPublicare: ultim?.publishedAt ?? null })) {
      return { facut: false, motiv: "nu e inca randul (ritm sau ora)" };
    }
  }

  const [cuvant] = opt.keywordId
    ? await db.select().from(blogKeywords).where(eq(blogKeywords.id, opt.keywordId)).limit(1)
    : await db
        .select()
        .from(blogKeywords)
        .where(eq(blogKeywords.status, "pending"))
        .orderBy(asc(blogKeywords.position), asc(blogKeywords.createdAt))
        .limit(1);
  if (!cuvant) return { facut: false, motiv: "niciun cuvant cheie in asteptare" };

  const existente = await db.select({ title: blogPosts.title, slug: blogPosts.slug }).from(blogPosts).orderBy(desc(blogPosts.publishedAt)).limit(60);

  try {
    const art = await genereazaArticolBlog(cuvant.keyword, existente.map((x) => x.title));
    let slug = slugDin(art.title) || slugDin(cuvant.keyword) || `articol-${Date.now()}`;
    const sluguri = new Set(existente.map((x) => x.slug));
    for (let i = 2; sluguri.has(slug); i++) slug = `${slugDin(art.title)}-${i}`;

    let coverUrl: string | null = null;
    let coverCredit: string | null = null;
    let coverSource: string | null = null;
    const poza = await cautaPoza(art.imageQuery || cuvant.keyword);
    if (poza) {
      const copiata = await urcaInCloudinary(poza.url, slug);
      // Pixabay nu permite hotlink: fara copie la noi, articolul ramane fara poza.
      coverUrl = copiata || (poza.sursa === "pexels" ? poza.url : null);
      if (coverUrl) {
        coverCredit = poza.credit;
        coverSource = poza.paginaSursa || poza.sursa;
      }
    }

    const [inserat] = await db
      .insert(blogPosts)
      .values({
        slug,
        keyword: cuvant.keyword,
        title: art.title,
        excerpt: art.excerpt,
        bodyHtml: art.html,
        tags: JSON.stringify(art.tags),
        coverUrl,
        coverCredit,
        coverSource,
        status: "published",
        publishedAt: new Date(),
      })
      .returning({ id: blogPosts.id });
    await db
      .update(blogKeywords)
      .set({ status: "done", postId: inserat.id, usedAt: new Date(), error: null })
      .where(eq(blogKeywords.id, cuvant.id));

    let facebook = "nepostat";
    if (setari.facebook) {
      const fb = await posteazaPeFacebook(inserat.id);
      facebook = fb.ok ? "postat" : `nepostat: ${fb.motiv}`;
    }
    console.log(`[autoblog] publicat „${art.title}" (${slug}); facebook: ${facebook}`);
    return { facut: true, id: inserat.id, slug, title: art.title, facebook };
  } catch (e) {
    const motiv = e instanceof Error ? e.message : String(e);
    console.error("[autoblog]", cuvant.keyword, motiv);
    await db.update(blogKeywords).set({ status: "failed", error: motiv.slice(0, 300), usedAt: new Date() }).where(eq(blogKeywords.id, cuvant.id));
    return { facut: false, motiv: `eroare la „${cuvant.keyword}": ${motiv}` };
  }
}

// ───────────────────────── Citire ─────────────────────────

export interface PostBlogDb {
  id: string;
  slug: string;
  keyword: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  tags: string[];
  coverUrl: string | null;
  coverCredit: string | null;
  coverSource: string | null;
  publishedAt: Date;
  fbPostId: string | null;
  fbPostedAt: Date | null;
  fbError: string | null;
}

function dinRand(r: typeof blogPosts.$inferSelect): PostBlogDb {
  let tags: string[] = [];
  try {
    tags = JSON.parse(r.tags || "[]");
  } catch {
    tags = [];
  }
  return { ...r, tags };
}

/** Articolele publicate, cele mai noi primele. Gol daca baza nu raspunde. */
export async function posturiPublicate(limita = 500): Promise<PostBlogDb[]> {
  try {
    await ensureBlogTables();
    const rows = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.status, "published"), lte(blogPosts.publishedAt, new Date())))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limita);
    return rows.map(dinRand);
  } catch (e) {
    console.error("[autoblog] citire:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function postDupaSlug(slug: string): Promise<PostBlogDb | null> {
  try {
    await ensureBlogTables();
    const [r] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
    return r && r.status === "published" ? dinRand(r) : null;
  } catch (e) {
    console.error("[autoblog] citire:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function toatePosturileAdmin(): Promise<PostBlogDb[]> {
  await ensureBlogTables();
  const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.publishedAt)).limit(500);
  return rows.map(dinRand);
}

export async function stergePost(id: string): Promise<void> {
  await ensureBlogTables();
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  await db.update(blogKeywords).set({ status: "pending", postId: null, usedAt: null }).where(eq(blogKeywords.postId, id));
}

/** Timpul de citire, ca la articolele MDX (200 de cuvinte pe minut). */
export function minuteCitire(html: string): number {
  return Math.max(1, Math.round(numarCuvinte(html) / 200));
}
