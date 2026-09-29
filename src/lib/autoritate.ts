/**
 * Scorul de autoritate al unei publicatii partenere, verificat de noi.
 *
 * 29.09.2026 — nu-l cerem partenerului, il citim singuri: un scor declarat se
 * umfla, unul citit din Moz nu. Doua surse:
 *
 *   - Moz DA (0–100) — cifra pe care o cer clientii de SEO si pe care sunt
 *     construite nivelurile (lib/niveluri-publicatii.ts: Argint 15, Aur 25,
 *     Platina 35). Cheie: MOZ_API_TOKEN (planul gratuit: 50 de verificari pe
 *     luna — ajunge la inscrieri si la reverificarea manuala).
 *   - Open PageRank (0–10) — optional, cheie OPR_API_KEY. Taie site-urile care
 *     si-au fabricat autoritate din retele de linkuri (le da aproape zero).
 *
 * Fara cheie, sau daca serviciul nu raspunde, functiile intorc null: fisa
 * arata „neverificat" si nimic altceva nu se opreste. O inscriere nu are voie
 * sa pice fiindca Moz e jos.
 */

export interface Autoritate {
  domainAuthority: number | null;
  pageAuthority: number | null;
  spamScore: number | null;
  openPageRank: number | null;
}

/** „https://www.Ziarul.ro/stiri?x=1" -> „ziarul.ro" */
export function domeniuDin(url: string): string | null {
  const t = (url || "").trim();
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    return /\./.test(h) ? h : null;
  } catch {
    return null;
  }
}

async function cuTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

/**
 * Tokenul din contul Moz („API Tokens") e perechea Access ID : Secret Key,
 * deja codata base64 — se trimite direct ca Basic. Il acceptam si ca pereche
 * necodata („mozscape-xxx:yyy"), daca cineva o lipeste asa.
 */
function antetMoz(token: string): string {
  const t = token.trim();
  return `Basic ${t.includes(":") ? Buffer.from(t).toString("base64") : t}`;
}

export async function mozDA(domeniu: string): Promise<Pick<Autoritate, "domainAuthority" | "pageAuthority" | "spamScore"> | null> {
  const token = process.env.MOZ_API_TOKEN;
  if (!token) return null;
  try {
    const r = await cuTimeout(
      fetch("https://lsapi.seomoz.com/v2/url_metrics", {
        method: "POST",
        headers: { Authorization: antetMoz(token), "Content-Type": "application/json" },
        body: JSON.stringify({ targets: [domeniu] }),
      }),
      12_000,
    );
    if (!r || !r.ok) {
      if (r) console.error("[autoritate] Moz", r.status, (await r.text().catch(() => "")).slice(0, 200));
      return null;
    }
    const j = (await r.json()) as { results?: Array<Record<string, unknown>> };
    const x = j.results?.[0];
    if (!x) return null;
    const nr = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
    return {
      domainAuthority: nr(x.domain_authority),
      pageAuthority: nr(x.page_authority),
      spamScore: nr(x.spam_score),
    };
  } catch (e) {
    console.error("[autoritate] Moz:", e);
    return null;
  }
}

export async function openPageRank(domeniu: string): Promise<number | null> {
  const key = process.env.OPR_API_KEY;
  if (!key) return null;
  try {
    const url = `https://openpagerank.keywordseverywhere.com/api/v1.0/getPageRank?domains%5B%5D=${encodeURIComponent(domeniu)}`;
    const r = await cuTimeout(fetch(url, { headers: { "API-OPR": key } }), 12_000);
    if (!r || !r.ok) return null;
    const j = (await r.json()) as { response?: Array<{ page_rank_decimal?: number | string }> };
    const v = Number(j.response?.[0]?.page_rank_decimal);
    return Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
  } catch {
    return null;
  }
}

export async function verificaAutoritate(url: string): Promise<Autoritate | null> {
  const d = domeniuDin(url);
  if (!d) return null;
  const [moz, opr] = await Promise.all([mozDA(d), openPageRank(d)]);
  if (!moz && opr == null) return null;
  return {
    domainAuthority: moz?.domainAuthority ?? null,
    pageAuthority: moz?.pageAuthority ?? null,
    spamScore: moz?.spamScore ?? null,
    openPageRank: opr,
  };
}
