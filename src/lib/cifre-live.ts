import { CIFRE } from "@/data/cifre";
import { RETEA_URL } from "@/lib/retea";

/**
 * Cifrele retelei, citite LIVE din platforma de publicare.
 *
 * 13.09.2026 — reteaua expune /api/public/cifre (fara parola): ziare, pagini
 * de Facebook, urmaritori, articole in ultimele 30 de zile, articole in
 * arhiva, si (cand cronul de reach e pornit) afisarile pe toate paginile.
 * Pagina de vanzare citeste de acolo, o data pe ora, ca cifrele sa nu mai
 * imbatraneasca in cod. Daca reteaua nu raspunde, raman cele din
 * data/cifre.ts, cu data lor — pagina nu cade si nu ramane goala.
 */

export interface CifreRetea {
  laData: string;
  perioada: string;
  publicatii: number;
  articolePeLuna: number;
  articoleInArhiva: number;
  articolePeZi: number;
  paginiFacebook: number;
  urmaritoriFacebook: number;
  /** Afisari pe TOATE paginile de Facebook, 30 de zile; null pana e masurat. */
  reachRetea30z: number | null;
  botosani: typeof CIFRE.botosani;
  googleAfisari: number;
  domainAuthority: number;
  pageAuthority: number;
  /** De unde vin cifrele: „live" (retea) sau „static" (data/cifre.ts). */
  sursa: "live" | "static";
}

interface RaspunsRetea {
  ok?: boolean;
  actualizat_la?: string;
  ziare?: number;
  pagini?: number;
  urmaritori?: number;
  articole_30z?: number;
  articole_total?: number;
  reach_30z?: number | null;
}

function staticCifre(): CifreRetea {
  return {
    laData: CIFRE.laData,
    perioada: CIFRE.perioada,
    publicatii: CIFRE.publicatii,
    articolePeLuna: CIFRE.articolePeLuna,
    articoleInArhiva: CIFRE.articoleInArhiva,
    articolePeZi: CIFRE.articolePeZi,
    paginiFacebook: CIFRE.paginiFacebook,
    urmaritoriFacebook: CIFRE.urmaritoriFacebook,
    reachRetea30z: null,
    botosani: CIFRE.botosani,
    googleAfisari: CIFRE.googleAfisari,
    domainAuthority: CIFRE.domainAuthority,
    pageAuthority: CIFRE.pageAuthority,
    sursa: "static",
  };
}

function dataRo(iso: string | undefined): string {
  if (!iso) return CIFRE.laData;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return CIFRE.laData;
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" });
}

export async function cifreLive(): Promise<CifreRetea> {
  const rezerva = staticCifre();
  try {
    const res = await fetch(`${RETEA_URL}/api/public/cifre`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return rezerva;
    const r = (await res.json()) as RaspunsRetea;
    if (!r.ok) return rezerva;
    const peLuna = Number(r.articole_30z || 0);
    // Plasa: o cifra suspect de mica (baza goala, cron picat) nu inlocuieste
    // una reala — mai bine cea veche cu data ei decat „12 articole pe luna".
    if (peLuna < 1000) return rezerva;
    return {
      ...rezerva,
      laData: dataRo(r.actualizat_la),
      perioada: "ultimele 30 de zile",
      // Numarul de publicatii NU se ia din retea (acolo e 51, cu Sibiu fara
      // domeniu); ramane cifra oficiala de pe site, 50.
      publicatii: rezerva.publicatii,
      articolePeLuna: peLuna,
      articoleInArhiva: Number(r.articole_total || rezerva.articoleInArhiva),
      articolePeZi: Math.round(peLuna / 30),
      paginiFacebook: Number(r.pagini || rezerva.paginiFacebook),
      urmaritoriFacebook: Number(r.urmaritori || rezerva.urmaritoriFacebook),
      reachRetea30z: typeof r.reach_30z === "number" && r.reach_30z > 0 ? r.reach_30z : null,
      sursa: "live",
    };
  } catch {
    return rezerva;
  }
}
