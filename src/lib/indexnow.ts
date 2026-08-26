import { SITE } from "@/data/site";

/**
 * IndexNow — anunta motoarele de cautare ca o pagina e noua sau s-a schimbat.
 *
 * De ce IndexNow si nu altceva: nu cere cont, cheie de API sau bibliotecă. Se
 * pune un fisier public cu o cheie, se trimite un POST, iar Bing, Yandex,
 * Seznam si Naver preiau unul de la altul — un singur apel ajunge la toate.
 * Indexare in minute, nu in saptamani.
 *
 * ATENTIE, ca sa nu existe asteptari gresite: GOOGLE NU FOLOSESTE INDEXNOW.
 * Pentru Google, calea reala ramane sitemap-ul trimis in Search Console si
 * "Request Indexing" din URL Inspection. Restul motoarelor le acoperim de aici.
 */

// Cheia e publica prin natura protocolului — fisierul de la /{cheie}.txt
// trebuie sa fie citibil de oricine, altfel motorul refuza notificarea.
export const INDEXNOW_KEY = "d1890b6a37e7001184c61de1dd2b29f2";

export interface IndexNowResult {
  ok: boolean;
  submitted: number;
  status?: number;
  error?: string;
}

/**
 * Trimite pana la 10.000 de adrese intr-un singur apel.
 * Nu arunca niciodata: indexarea e un bonus, nu are voie sa strice publicarea.
 */
export async function pingIndexNow(urls: string[]): Promise<IndexNowResult> {
  const host = SITE.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // IndexNow refuza lotul daca o singura adresa e de pe alt domeniu, asa ca
  // filtram dupa host, nu dupa protocol. Verificarea pe host prinde si greseli
  // de configurare (ex. adrese de localhost ajunse din greseala in sitemap).
  const clean = [
    ...new Set(
      urls.filter((u) => {
        try {
          return new URL(u).hostname.replace(/^www\./, "") === host.replace(/^www\./, "");
        } catch {
          return false;
        }
      }),
    ),
  ].slice(0, 10000);

  if (clean.length === 0) {
    return {
      ok: false,
      submitted: 0,
      error: `Nicio adresă de pe ${host} — verifică NEXT_PUBLIC_SITE_URL`,
    };
  }

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`,
        urlList: clean,
      }),
      signal: AbortSignal.timeout(10000),
    });

    // 200 = acceptat, 202 = acceptat, cheia se verifica ulterior. Ambele-s bune.
    const ok = res.status === 200 || res.status === 202;
    return {
      ok,
      submitted: ok ? clean.length : 0,
      status: res.status,
      error: ok ? undefined : await res.text().catch(() => `HTTP ${res.status}`),
    };
  } catch (err) {
    return {
      ok: false,
      submitted: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Anunta o singura pagina — folosit dupa publicarea unui articol nou. */
export function pingIndexNowUrl(url: string): Promise<IndexNowResult> {
  return pingIndexNow([url]);
}
