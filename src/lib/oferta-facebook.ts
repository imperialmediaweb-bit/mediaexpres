import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { ensureBlogTables } from "@/lib/ensure-columns";
import { getCloudinaryConfig, signUploadParams } from "@/lib/cloudinary";
import { oraRomaniei } from "@/lib/autoblog";
import { posteazaPePagina } from "@/lib/facebook-pagina";
import { promoDeadlineLabel } from "@/data/packages";
import { SITE } from "@/data/site";

/**
 * Oferta zilnica pe Facebook (03.10.2026).
 *
 * Proprietarul: „o data pe zi, pe langa articol, sa pui oferta: profita azi
 * de oferta de 500, iti dau o poza". O postare pe zi pe pagina Media Express,
 * cu una din pozele lui si unul din texte, prin rotatie, cu termenul curent
 * al ofertei (din 3 in 3 zile, data/packages.ts) si linkul catre /oferta-500.
 * Postare cu poza, nu link simplu: Facebook o arata la mai multi.
 */

export interface SetariOferta {
  activ: boolean;
  /** Ora Romaniei la care pleaca (0-23). */
  ora: number;
  poze: string[];
  texte: string[];
  /** Ziua ultimei postari, „AAAA-LL-ZZ", ora Romaniei. */
  ultimaZi: string | null;
  ultimaEroare: string | null;
  /** Imaginea generata cu OpenAI pentru fiecare zi („AAAA-LL-ZZ" → adresa Cloudinary). */
  imaginiAI: Record<string, string>;
}

export const ORA_IMPLICITA = 10;

/** Textele implicite. `{termen}` se inlocuieste cu data curenta a ofertei. */
export const TEXTE_IMPLICITE = [
  `Profită azi de oferta de 500 lei: articolul tău publicat în 50 de ziare online din România, cu link către site și promovare pe Facebook inclusă. Valabilă până pe {termen}.\n👉 ${SITE.url}/oferta-500`,
  `Vrei ca firma ta să apară în presă? 50 de ziare, un singur preț: 500 lei. Trimiți textul și pozele, noi publicăm în 12 ore lucrătoare și îți dăm raportul cu toate linkurile. Oferta ține până pe {termen}.\n👉 ${SITE.url}/oferta-500`,
  `Advertorial în 50 de ziare, 500 lei, cu link dofollow și 3 zile de promovare pe Facebook pe ziarul ales de tine. Lista completă a ziarelor e publică, cu scorurile DA și PA. Până pe {termen}.\n👉 ${SITE.url}/oferta-500`,
  `Lansezi ceva, deschizi un sediu nou, ai o ofertă? Spune-o în 50 de ziare deodată, pentru 500 lei. Fără contract, fără abonament, plătești o singură dată. Valabil până pe {termen}.\n👉 ${SITE.url}/oferta-500`,
];

const IMPLICITE: SetariOferta = { activ: false, ora: ORA_IMPLICITA, poze: [], texte: TEXTE_IMPLICITE, ultimaZi: null, ultimaEroare: null, imaginiAI: {} };

export async function citesteSetariOferta(): Promise<SetariOferta> {
  await ensureBlogTables();
  const [r] = await db.select().from(appSettings).where(eq(appSettings.key, "oferta-facebook")).limit(1);
  if (!r) return IMPLICITE;
  try {
    const j = JSON.parse(r.value) as Partial<SetariOferta>;
    return {
      activ: Boolean(j.activ),
      ora: Number.isInteger(j.ora) && (j.ora as number) >= 0 && (j.ora as number) <= 23 ? (j.ora as number) : ORA_IMPLICITA,
      poze: Array.isArray(j.poze) ? j.poze.map(String).filter(Boolean).slice(0, 10) : [],
      texte: Array.isArray(j.texte) && j.texte.length ? j.texte.map(String).filter((t) => t.trim()).slice(0, 10) : TEXTE_IMPLICITE,
      ultimaZi: typeof j.ultimaZi === "string" ? j.ultimaZi : null,
      ultimaEroare: typeof j.ultimaEroare === "string" ? j.ultimaEroare : null,
      imaginiAI: j.imaginiAI && typeof j.imaginiAI === "object" ? (j.imaginiAI as Record<string, string>) : {},
    };
  } catch {
    return IMPLICITE;
  }
}

export async function salveazaSetariOferta(s: SetariOferta): Promise<void> {
  await ensureBlogTables();
  await db
    .insert(appSettings)
    .values({ key: "oferta-facebook", value: JSON.stringify(s), updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(s), updatedAt: new Date() } });
}

/** Textele din caseta de admin: separate printr-o linie goala. */
export function parseazaTexte(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 20)
    .slice(0, 10);
}

export function ziRomaniei(d = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}

/** Numarul zilei, ca sa rotim textele si pozele fara sa tinem minte nimic. */
function indexZi(zi: string): number {
  return Math.floor(new Date(`${zi}T00:00:00Z`).getTime() / 86_400_000);
}

export function textulZilei(s: { texte: string[] }, zi: string, acum = Date.now()): string {
  const texte = s.texte.length ? s.texte : TEXTE_IMPLICITE;
  const t = texte[indexZi(zi) % texte.length];
  const termen = promoDeadlineLabel(acum) || "";
  return t.replace(/\{termen\}/g, termen).replace(/\s*Valabil[ăa] p[âa]n[ăa] pe \.\s*/g, " ").replace(/p[âa]n[ăa] pe \./g, "").trim();
}

export function pozaZilei(s: { poze: string[] }, zi: string): string | null {
  if (!s.poze.length) return null;
  return s.poze[indexZi(zi) % s.poze.length];
}

/** E ora si nu am postat azi? */
export function eRandulOfertei(s: Pick<SetariOferta, "activ" | "ora" | "ultimaZi">, acum = new Date()): boolean {
  if (!s.activ) return false;
  const zi = ziRomaniei(acum);
  if (s.ultimaZi === zi) return false;
  return oraRomaniei(acum) >= s.ora;
}

/** Poza din admin: copiata in Cloudinary, ca sa aiba o adresa publica stabila. */
export async function urcaPozaOferta(bytes: Buffer, tip: string): Promise<string | null> {
  const cfg = getCloudinaryConfig();
  if (!cfg) return null;
  const folder = `${cfg.uploadFolder}/oferta`;
  const publicId = `oferta-${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const semnat = signUploadParams({ folder, public_id: publicId, timestamp });
  if (!semnat) return null;
  const fd = new FormData();
  fd.set("file", `data:${tip};base64,${bytes.toString("base64")}`);
  fd.set("folder", folder);
  fd.set("public_id", publicId);
  fd.set("timestamp", String(timestamp));
  fd.set("signature", String(semnat.signature));
  fd.set("api_key", cfg.apiKey);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, { method: "POST", body: fd });
  if (!r.ok) {
    console.warn("[oferta-facebook] cloudinary", r.status, (await r.text()).slice(0, 200));
    return null;
  }
  const j = (await r.json()) as { secure_url?: string };
  return j.secure_url || null;
}

export type RezultatOferta = { postat: false; motiv: string } | { postat: true; id: string };

/**
 * 08.10.2026 — proprietarul: „OpenAI, imagine pentru promotie". Fara poze urcate
 * in admin, oferta zilnica primeste o imagine noua, generata cu OpenAI, fara
 * text in ea (modelele scriu prost in romana). Teme prin rotatie, ca sa nu
 * arate la fel in fiecare zi.
 */
const TEME_IMAGINE = [
  "a neat stack of fresh local newspapers on a wooden cafe table, morning light, a cup of coffee, shallow depth of field",
  "a small business owner in a bright shop smiling while reading a news article about her business on a smartphone",
  "a laptop on a modern office desk showing an online news website with photos, a notebook and a pen beside it",
  "a panoramic view of a Romanian city center at golden hour with people walking, warm tones",
  "a printing press with newspapers coming out, dynamic motion, editorial photography",
  "a young entrepreneur in a workshop holding a tablet with a news page, natural light, documentary style",
  "a wall of many different newspaper front pages, colorful, slightly blurred, press concept",
];

export async function genereazaImagineOferta(zi: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const tema = TEME_IMAGINE[Math.floor(new Date(`${zi}T00:00:00Z`).getTime() / 86_400_000) % TEME_IMAGINE.length];
  const prompt = `${tema}. Photorealistic, professional advertising photo, horizontal 16:9 composition, no text, no letters, no logos, no watermarks.`;
  for (const corp of [
    { model: "gpt-image-1", prompt, size: "1536x1024", n: 1 },
    { model: "dall-e-3", prompt, size: "1792x1024", n: 1, response_format: "b64_json" },
  ]) {
    try {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify(corp),
      });
      if (!r.ok) {
        console.warn("[oferta-facebook] imagine", corp.model, r.status, (await r.text()).slice(0, 200));
        continue;
      }
      const j = (await r.json()) as { data?: { b64_json?: string }[] };
      const b64 = j.data?.[0]?.b64_json;
      if (!b64) continue;
      return await urcaPozaOferta(Buffer.from(b64, "base64"), "image/png");
    } catch (e) {
      console.warn("[oferta-facebook] imagine", corp.model, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

/** Imaginea zilei: cea deja generata, sau una noua (salvata, ultimele 14 zile). */
export async function imagineaZilei(s: SetariOferta, zi: string): Promise<{ url: string | null; setari: SetariOferta }> {
  if (s.imaginiAI[zi]) return { url: s.imaginiAI[zi], setari: s };
  const url = await genereazaImagineOferta(zi);
  if (!url) return { url: null, setari: s };
  const zile = Object.keys(s.imaginiAI).sort().slice(-13);
  const imaginiAI: Record<string, string> = {};
  for (const z of zile) imaginiAI[z] = s.imaginiAI[z];
  imaginiAI[zi] = url;
  const nou = { ...s, imaginiAI };
  await salveazaSetariOferta(nou);
  return { url, setari: nou };
}

/** Postarea propriu-zisa. Cu `fortat`, ignora ora si ziua (butonul din admin). */
export async function posteazaOferta(opt: { fortat?: boolean } = {}): Promise<RezultatOferta> {
  const s = await citesteSetariOferta();
  const acum = new Date();
  if (!opt.fortat && !eRandulOfertei(s, acum)) return { postat: false, motiv: s.activ ? "nu e inca ora, sau azi e deja postata" : "oferta zilnica oprita" };
  const zi = ziRomaniei(acum);
  const mesaj = textulZilei(s, zi, acum.getTime());
  let poza = pozaZilei(s, zi);
  let link = `${SITE.url}/oferta-500`;
  let setari = s;
  // Fara poze urcate: imagine generata cu OpenAI, pusa pe pagina de trecere
  // /promo/<zi>, din care Facebook ia imaginea in previzualizarea linkului
  // (si cand postarea pleaca prin retea, care trimite doar text + link).
  if (!poza) {
    const g = await imagineaZilei(s, zi);
    setari = g.setari;
    if (g.url) {
      poza = g.url;
      link = `${SITE.url}/promo/${zi}`;
    }
  }

  {
    const r = await posteazaPePagina({ mesaj, link, poza });
    if (!r.ok) {
      await salveazaSetariOferta({ ...setari, ultimaEroare: r.motiv.slice(0, 300) });
      return { postat: false, motiv: r.motiv };
    }
    const id = r.id;
    await salveazaSetariOferta({ ...setari, ultimaZi: zi, ultimaEroare: null });
    console.log(`[oferta-facebook] postat ${id}`);
    return { postat: true, id };
  }
}
