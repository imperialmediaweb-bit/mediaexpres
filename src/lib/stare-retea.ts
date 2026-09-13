import { RETEA_URL } from "@/lib/retea";

/**
 * Starea retelei, LIVE: cate ziare au publicat in ultimele 24 de ore, cate
 * articole, si pe fiecare ziar in parte — ultimul articol, linkul, pagina
 * de Facebook.
 *
 * 13.09.2026 — raspunsul la „sunt ziare fantoma?" nu mai e o afirmatie a
 * noastra, ci o lista pe care omul o verifica singur: „Cluj Expres, azi 12
 * articole, ultimul acum 2 ore" — da click, e acolo. Reteaua expune
 * /api/public/stare fara parola (fara tokenuri, fara urmaritori pe pagina).
 * Se citeste o data la 10 minute; cand nu raspunde, sectiunea nu apare —
 * mai bine lipsa decat o cifra veche prezentata ca „acum".
 */

export interface ZiarStare {
  slug: string;
  nume: string;
  domeniu: string;
  url: string;
  facebook: string | null;
  articole_24h: number;
  locale_24h: number;
  ultimul_articol: string | null;
}

export interface StareRetea {
  actualizatLa: string;
  ziareTotal: number;
  ziareCarePublica: number;
  articole24h: number;
  locale24h: number;
  ziare: ZiarStare[];
}

interface Raspuns {
  ok?: boolean;
  actualizat_la?: string;
  ziare_total?: number;
  ziare_care_publica?: number;
  articole_24h?: number;
  locale_24h?: number;
  ziare?: ZiarStare[];
}

export async function stareRetea(): Promise<StareRetea | null> {
  try {
    const res = await fetch(`${RETEA_URL}/api/public/stare`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const r = (await res.json()) as Raspuns;
    if (!r.ok || !Array.isArray(r.ziare) || r.ziare.length < 40) return null;
    // Sibiu Expres nu are domeniu inca (se cumpara in septembrie 2026) —
    // nu-l aratam ca „ziar care publica" cand adresa lui nu se deschide.
    // Cifra oficiala, de pe tot site-ul, e 50 (41 locale + 9 nationale);
    // totalurile se calculeaza din lista ramasa, nu din ce spune reteaua.
    const ziare = r.ziare.filter((z) => z.slug !== "sibiu-expres").sort((a, b) => b.articole_24h - a.articole_24h);
    return {
      actualizatLa: r.actualizat_la || new Date().toISOString(),
      ziareTotal: ziare.length,
      ziareCarePublica: ziare.filter((z) => z.articole_24h > 0).length,
      articole24h: ziare.reduce((s, z) => s + Number(z.articole_24h || 0), 0),
      locale24h: ziare.reduce((s, z) => s + Number(z.locale_24h || 0), 0),
      ziare,
    };
  } catch {
    return null;
  }
}

/** „acum 2 ore", „acum 35 de minute", „ieri". */
export function acum(iso: string | null, fata: Date = new Date()): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const min = Math.max(0, Math.round((fata.getTime() - d.getTime()) / 60000));
  if (min < 60) return `acum ${min === 1 ? "un minut" : `${min} de minute`}`;
  const ore = Math.round(min / 60);
  if (ore < 24) return `acum ${ore === 1 ? "o oră" : `${ore} ore`}`;
  const zile = Math.round(ore / 24);
  return zile === 1 ? "ieri" : `acum ${zile} zile`;
}
