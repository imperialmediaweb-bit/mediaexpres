/**
 * Ultimele stiri din ziarul local al unui judet, din fluxul RSS al ziarului
 * (<ziar>/feed). Le punem jos pe paginile /publicare-comunicat-<judet>, ca
 * pagina sa se schimbe singura in fiecare zi si Google sa o vada vie (18.11.2026).
 *
 * Nu arunca niciodata: daca ziarul nu raspunde, pagina iese fara caseta.
 */
export interface StireJudet {
  titlu: string;
  link: string;
  data: Date | null;
}

function curata(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function camp(item: string, tag: string): string {
  const m = item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? curata(m[1]) : "";
}

export async function stiriZiar(urlZiar: string, cate = 5): Promise<StireJudet[]> {
  try {
    const baza = new URL(urlZiar);
    const r = await fetch(new URL("/feed", baza).toString(), {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return [];
    const xml = await r.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    const stiri: StireJudet[] = [];
    for (const it of items) {
      const titlu = camp(it, "title");
      const link = camp(it, "link");
      if (!titlu || !link) continue;
      // Doar linkuri de pe ziarul lui, nimic adus din alta parte.
      try {
        if (new URL(link).hostname !== baza.hostname) continue;
      } catch {
        continue;
      }
      const d = new Date(camp(it, "pubDate"));
      stiri.push({ titlu, link, data: isNaN(d.getTime()) ? null : d });
      if (stiri.length >= cate) break;
    }
    return stiri;
  } catch {
    return [];
  }
}
