import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, blogPosts, orderSubmissions } from "@/db/schema";
import { SITE } from "@/data/site";
import { ensureBlogTables, ensureOrderColumns } from "@/lib/ensure-columns";
import { slugDin, posteazaPeFacebook } from "@/lib/autoblog";
import { posteazaPeLinkedIn } from "@/lib/linkedin";
import { pingIndexNowUrl } from "@/lib/indexnow";
import { RETEA_URL } from "@/lib/retea";

/**
 * 24.11.2026 (owner): fiecare campanie publicata apare si pe MediaExpres —
 * o varianta UNICA a articolului pe mediaexpress.ro/blog (eticheta „campanie"),
 * cu un rand despre oferta noastra la final, plus postare pe pagina de Facebook
 * MediaExpres si pe LinkedIn („Un nou client ne-a ales"). Doar pentru comenzile
 * cu bifa „vitrina" (implicit da), fara cazino, din 24.11.2026 incoace.
 * Cel mult VITRINA_PE_ZI (2) pe zi; fara campanii noi, se iau cele vechi, pe rand.
 * Oprire: VITRINA=0.
 */
const STARE = "vitrina_campanii";
const DE_LA = new Date(process.env.VITRINA_DE_LA || "2026-11-24T00:00:00Z");

type Stare = { facute: string[]; azi: string; nrAzi: number };

async function citesteStare(): Promise<Stare> {
  const [r] = await db.select().from(appSettings).where(eq(appSettings.key, STARE)).limit(1);
  try {
    return r ? (JSON.parse(r.value) as Stare) : { facute: [], azi: "", nrAzi: 0 };
  } catch {
    return { facute: [], azi: "", nrAzi: 0 };
  }
}

async function scrieStare(s: Stare) {
  const v = JSON.stringify({ ...s, facute: s.facute.slice(-2000) });
  await db
    .insert(appSettings)
    .values({ key: STARE, value: v, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: v, updatedAt: new Date() } });
}

const ziRo = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date());

function text(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function rescrie(d: { titlu: string; corp: string; firma: string; site: string }): Promise<{ title: string; excerpt: string; html: string } | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const prompt = `Rescrie articolul de mai jos pentru blogul MediaExpres, ca o prezentare a unei campanii de presă.
Reguli:
- Text complet nou (alt titlu, alte fraze), aceleași fapte. NU inventa cifre, premii, nume sau promisiuni.
- Română corectă, cu diacritice, ton jurnalistic calm, 250-450 de cuvinte, 3-5 paragrafe.
- Păstrează o singură dată un link HTML spre site-ul firmei: <a href="${d.site}">${d.firma}</a> (sau numele brandului din text).
- Fără prețuri, fără „cel mai bun", fără garanții.
Răspunde DOAR cu JSON: {"title": "...", "excerpt": "o frază de 140-180 de caractere", "html": "<p>...</p>"}

TITLU: ${d.titlu}
ARTICOL:
${d.corp.slice(0, 8000)}`;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.VITRINA_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) return null;
  try {
    const j = JSON.parse(((await r.json()) as { choices: { message: { content: string } }[] }).choices[0].message.content) as {
      title?: string;
      excerpt?: string;
      html?: string;
    };
    if (!j.title || !j.html || text(j.html).length < 600) return null;
    return { title: j.title.trim(), excerpt: (j.excerpt || "").trim(), html: j.html };
  } catch {
    return null;
  }
}

type CampanieSursa = { cheie: string; titlu: string; corp: string; firma: string; site: string; poza: string | null; noua: boolean };

/** Campaniile introduse direct in Reteaua Express (nu prin MediaExpres), publicate, fara cazino. */
async function campaniiDinRetea(): Promise<CampanieSursa[]> {
  const key = process.env.RETEA_KEY;
  if (!key) return [];
  try {
    const r = await fetch(`${RETEA_URL}/api/admin/comenzi`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return [];
    const j = (await r.json()) as { comenzi?: Record<string, unknown>[] };
    return (j.comenzi || [])
      .filter((c) => Number(c.articole_live || 0) > 0 && !/cazino|casino|pariu/i.test(`${c.pachet || ""} ${c.observatii || ""} ${c.titlu || ""}`))
      // Campaniile agentiilor (clientii lor nu sunt ai nostri de aratat): VITRINA_EXCLUDE, cuvinte cautate in client/email/observatii.
      .filter((c) => {
        const ex = (process.env.VITRINA_EXCLUDE || "emblema,june,whitepress,deep media").split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
        const t = `${c.client || ""} ${c.email || ""} ${c.observatii || ""}`.toLowerCase();
        return !ex.some((w) => t.includes(w));
      })
      .map((c) => {
        let poza: string | null = null;
        try {
          const pz = typeof c.poze === "string" ? JSON.parse(c.poze) : c.poze;
          poza = Array.isArray(pz) ? (typeof pz[0] === "string" ? pz[0] : (pz[0] as { url?: string })?.url) || null : null;
        } catch {
          /* fara poza */
        }
        return {
          cheie: `retea:${c.id}`,
          titlu: String(c.titlu || ""),
          corp: text(String(c.material || "")),
          firma: String(c.client || ""),
          site: String(c.link_client || ""),
          poza,
          noua: new Date(String(c.creata_la || 0)) >= DE_LA,
        };
      })
      .filter((c) => c.corp.length > 400 && c.titlu);
  } catch {
    return [];
  }
}

export async function publicaUrmatoareaCampanie(): Promise<{ facut?: string; motiv?: string }> {
  if (process.env.VITRINA === "0") return { motiv: "oprit (VITRINA=0)" };
  await ensureOrderColumns();
  await ensureBlogTables();
  const st = await citesteStare();
  const azi = ziRo();
  if (st.azi !== azi) {
    st.azi = azi;
    st.nrAzi = 0;
  }
  if (st.nrAzi >= Number(process.env.VITRINA_PE_ZI || 2)) return { motiv: "plafonul zilei atins" };
  const ora = Number(new Intl.DateTimeFormat("ro-RO", { hour: "numeric", hour12: false, timeZone: "Europe/Bucharest" }).format(new Date()));
  if (ora < 9 || ora >= 20) return { motiv: "in afara orelor 09-20" };

  const candidati = await db
    .select()
    .from(orderSubmissions)
    .where(
      and(
        isNotNull(orderSubmissions.reteaId),
        inArray(orderSubmissions.status, ["paid", "published"]),
        eq(orderSubmissions.vitrinaOk, true),
        eq(orderSubmissions.isCasino, false),
      ),
    )
    .orderBy(desc(orderSubmissions.createdAt))
    .limit(300);
  // Ordinea (owner, 24.11.2026): campaniile noi (MediaExpres, apoi cele puse
  // direct in Reteaua Express), apoi, in zilele fara ele, cele facute deja.
  const dinMe: CampanieSursa[] = candidati
    .filter((x) => (x.body || "").trim().length > 400)
    .map((x) => {
      let poza: string | null = null;
      try {
        poza = (JSON.parse(x.images || "[]") as { url?: string }[])[0]?.url || null;
      } catch {
        /* fara poza */
      }
      return { cheie: x.id, titlu: x.title || "", corp: x.body || "", firma: x.companyName || "", site: x.siteUrl?.trim() || "", poza, noua: x.createdAt >= DE_LA };
    });
  const dinRetea = await campaniiDinRetea();
  const toate = [...dinMe, ...dinRetea].filter((x) => !st.facute.includes(x.cheie));
  // aceeasi campanie poate fi in ambele liste (comanda MediaExpres trimisa in retea): dupa titlu
  const vazute = new Set<string>();
  const unice = toate.filter((x) => {
    const k = x.titlu.trim().toLowerCase();
    if (vazute.has(k)) return false;
    vazute.add(k);
    return true;
  });
  const c = unice.find((x) => x.noua) || unice[0];
  if (!c) return { motiv: "nicio campanie noua" };
  st.facute.push(c.cheie); // o singura incercare pe campanie, chiar daca pica

  const firma = (c.firma || "").replace(/\b(S\.?R\.?L\.?|S\.?A\.?|P\.?F\.?A\.?)\b/gi, "").trim() || "clientul nostru";
  const site = c.site;
  const rescris = await rescrie({ titlu: c.titlu, corp: c.corp, firma, site });
  if (!rescris) {
    await scrieStare(st);
    return { motiv: `rescrierea a esuat pentru ${c.cheie}` };
  }
  const poza = c.poza;
  const html = `${rescris.html}
<p><em>Articolul a fost distribuit prin MediaExpres în 50 de ziare din România. Vrei și tu articolul firmei tale în 50 de ziare? <a href="${SITE.url}/oferta-500?utm_source=blog&utm_medium=campanie">Află mai multe</a>.</em></p>`;
  let slug = slugDin(rescris.title).slice(0, 90);
  const [exista] = await db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  if (exista) slug = `${slug}-${Date.now().toString(36).slice(-5)}`;
  const [post] = await db
    .insert(blogPosts)
    .values({
      slug,
      keyword: `campanie:${c.cheie}`,
      title: rescris.title,
      excerpt: rescris.excerpt || text(rescris.html).slice(0, 170),
      bodyHtml: html,
      tags: JSON.stringify(["campanie", "client"]),
      coverUrl: poza,
      coverCredit: firma,
      coverSource: "client",
      status: "published",
      publishedAt: new Date(),
    })
    .returning({ id: blogPosts.id });
  const url = `${SITE.url}/blog/${slug}`;
  await pingIndexNowUrl(url).catch(() => undefined);
  const fb = await posteazaPeFacebook(post.id).catch((e: unknown) => ({ ok: false, motiv: String(e) }));
  const li = await posteazaPeLinkedIn({
    text: `Un nou client ne-a ales: ${firma}.\n\n${rescris.title}\n\nArticolul firmei a apărut în 50 de ziare din România. Povestea completă: ${url}\n\nVrei și tu articolul firmei tale în 50 de ziare? ${SITE.url}/oferta-500?utm_source=linkedin&utm_medium=social&utm_campaign=client_nou`,
    link: url,
    titlu: rescris.title,
    descriere: rescris.excerpt,
  }).catch((e: unknown) => ({ ok: false as const, motiv: String(e) }));
  st.nrAzi += 1;
  await scrieStare(st);
  return { facut: `${slug} | facebook: ${fb.ok ? "da" : "nu"} | linkedin: ${li.ok ? "da" : `nu (${"motiv" in li ? li.motiv : ""})`}` };
}
