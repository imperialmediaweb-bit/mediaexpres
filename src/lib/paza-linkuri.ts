/**
 * Paza linkurilor la publicatiile partenere, 12 luni (29.09.2026).
 *
 * Ce ne deosebeste de o piata de linkuri: nu vindem „un articol publicat",
 * vindem un articol care RAMANE online, cu linkul intreg, un an. Verificam
 * singuri, periodic:
 *   - pagina raspunde (nu 404/410);
 *   - linkul catre client e acolo;
 *   - nu e nofollow / sponsored / ugc, daca partenerul a promis dofollow;
 *   - pagina nu e ascunsa de Google (noindex in meta sau in antet).
 *
 * Ce NU putem verifica: daca Google a indexat efectiv pagina unui site care
 * nu e al nostru — asta o stie doar Google. Verificam ca pagina POATE fi
 * indexata (nimic nu o ascunde), si spunem asta cinstit clientului.
 */

import { domeniuDin } from "@/lib/autoritate";

export type StareLink = "ok" | "pagina_lipsa" | "link_lipsa" | "nofollow" | "noindex" | "eroare";

/** Probleme sigure: blocheaza plata partenerului si declanseaza alerta. */
export const STARI_BLOCANTE: StareLink[] = ["pagina_lipsa", "link_lipsa", "nofollow", "noindex"];

export function eBlocant(s: string | null | undefined): boolean {
  return Boolean(s) && (STARI_BLOCANTE as string[]).includes(s as string);
}

export const ETICHETE_LINK: Record<StareLink, string> = {
  ok: "Online, cu linkul activ",
  pagina_lipsa: "Pagina nu mai există",
  link_lipsa: "Linkul către client lipsește din articol",
  nofollow: "Linkul e marcat nofollow/sponsored",
  noindex: "Pagina e ascunsă de Google (noindex)",
  eroare: "Site-ul nu a răspuns la verificare",
};

/** Cat asteptam pana la urmatoarea verificare. */
export const ZILE_INTRE_VERIFICARI = 7;
export const ZILE_REVERIFICARE_PROBLEMA = 1;
/** De cate ori la rand trebuie sa vedem problema inainte sa alertam. */
export const CONFIRMARI_PROBLEMA = 2;
/** La „eroare" (site cazut, bot blocat) suntem mai rabdatori. */
export const CONFIRMARI_EROARE = 5;
/** Cat are partenerul sa repare, dupa alerta, pana escaladam la admin. */
export const ZILE_REPARARE = 3;

export interface RezultatVerificare {
  stare: StareLink;
  detalii: string;
}

/** Analiza HTML-ului, separata de fetch ca sa poata fi testata. */
export function analizeazaPagina(
  html: string,
  antetRobots: string | null,
  domeniiClient: string[],
  dofollowAsteptat: boolean,
): RezultatVerificare {
  const robotsMeta = html.match(/<meta[^>]+name=["']?(robots|googlebot)["']?[^>]*>/gi) || [];
  if (robotsMeta.some((m) => /noindex/i.test(m)) || /noindex/i.test(antetRobots || "")) {
    return { stare: "noindex", detalii: "meta robots / X-Robots-Tag conține noindex" };
  }
  if (domeniiClient.length === 0) return { stare: "ok", detalii: "pagina e online (nu știm domeniul clientului)" };

  const ancore = html.match(/<a\s[^>]*href\s*=\s*["']?[^"'\s>]+[^>]*>/gi) || [];
  const catreClient = ancore.filter((a) => {
    const href = a.match(/href\s*=\s*["']?([^"'\s>]+)/i)?.[1] || "";
    const d = domeniuDin(href.startsWith("//") ? `https:${href}` : href);
    return Boolean(d) && domeniiClient.some((c) => d === c || d!.endsWith("." + c));
  });
  if (catreClient.length === 0) return { stare: "link_lipsa", detalii: `niciun link către ${domeniiClient.join(", ")}` };

  if (dofollowAsteptat) {
    const curat = catreClient.some((a) => {
      const rel = a.match(/rel\s*=\s*["']([^"']*)["']/i)?.[1] || a.match(/rel\s*=\s*([^\s>]+)/i)?.[1] || "";
      return !/nofollow|sponsored|ugc/i.test(rel);
    });
    if (!curat) return { stare: "nofollow", detalii: "toate linkurile către client au rel nofollow/sponsored/ugc" };
  }
  return { stare: "ok", detalii: `${catreClient.length} ${catreClient.length === 1 ? "link" : "linkuri"} către client` };
}

export async function verificaLink(d: {
  url: string;
  domeniiClient: string[];
  dofollow: boolean;
  /** La influenceri verificam doar ca postarea exista. */
  doarPagina?: boolean;
}): Promise<RezultatVerificare> {
  let res: Response;
  try {
    res = await fetch(d.url, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; MediaExpresBot/1.0; +https://mediaexpress.ro)",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return { stare: "eroare", detalii: e instanceof Error ? e.message.slice(0, 120) : "fără răspuns" };
  }
  if (res.status === 404 || res.status === 410) return { stare: "pagina_lipsa", detalii: `HTTP ${res.status}` };
  if (!res.ok) return { stare: "eroare", detalii: `HTTP ${res.status}` };
  if (d.doarPagina) return { stare: "ok", detalii: "postarea e online" };

  const html = (await res.text()).slice(0, 2_000_000);
  return analizeazaPagina(html, res.headers.get("x-robots-tag"), d.domeniiClient, d.dofollow);
}
