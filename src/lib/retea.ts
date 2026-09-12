/**
 * Legatura cu platforma de publicare (Reteaua Expres).
 *
 * Comenzile intra aici (MediaExpres: plata, factura, materiale), dar
 * articolele se publica DINCOLO, in aplicatia retelei, unde fiecare campanie
 * are un token si o pagina publica /raport/<token>. Pana acum, ca sa afli
 * unde a ajuns o campanie, deschideai a doua aplicatie si cautai clientul cu
 * ochii. Aici, pagina comenzii intreaba reteaua direct: cate ziare au
 * publicat, cand a iesit ultimul, si linkul raportului, gata de trimis.
 *
 * Potrivirea: intai dupa `comanda_externa` din retea = referinta comenzii de
 * aici (cs_... / op_... / man_...), apoi, ca rezerva, dupa emailul
 * clientului (cea mai noua campanie). Cand campania se creeaza in retea cu
 * referinta din MediaExpres, potrivirea e exacta; fara ea, e dupa email.
 *
 * Configurare (Railway, MediaExpres):
 *   RETEA_URL = https://botosaniexpres.ro   (aplicatia retelei)
 *   RETEA_KEY = valoarea CRON_SECRET din aplicatia retelei
 * Fara RETEA_KEY, functia intoarce `neconfigurat` si pagina spune asta,
 * nu cade.
 */

export const RETEA_URL = (process.env.RETEA_URL || "https://botosaniexpres.ro").replace(/\/$/, "");

export interface CampanieRetea {
  id: number;
  client: string;
  email: string | null;
  stare: string;
  token: string | null;
  /** Pagina publica a raportului, fara parola. Null pana la primul articol. */
  raportUrl: string | null;
  /** Cate ziare au primit articol (inclusiv programate). */
  articole: number;
  /** Cate sunt deja live. */
  articoleLive: number;
  ultimulLa: string | null;
  creataLa: string | null;
  comandaExterna: string | null;
  /** Cum a fost gasita: dupa referinta (exact) sau dupa email (probabil). */
  potrivire: "referinta" | "email";
}

interface RandRetea {
  id: number;
  client: string;
  email: string | null;
  stare: string;
  token: string | null;
  articole: number;
  articole_live: number;
  ultimul_la: string | null;
  creata_la: string | null;
  comanda_externa: string | null;
}

export type RezultatRetea =
  | { stare: "gasita"; campanie: CampanieRetea }
  | { stare: "negasita" }
  | { stare: "neconfigurat" }
  | { stare: "eroare"; mesaj: string };

function transforma(r: RandRetea, potrivire: "referinta" | "email"): CampanieRetea {
  return {
    id: r.id,
    client: r.client,
    email: r.email,
    stare: r.stare,
    token: r.token,
    raportUrl: r.token ? `${RETEA_URL}/raport/${r.token}` : null,
    articole: Number(r.articole || 0),
    articoleLive: Number(r.articole_live || 0),
    ultimulLa: r.ultimul_la,
    creataLa: r.creata_la,
    comandaExterna: r.comanda_externa,
    potrivire,
  };
}

/** Toate campaniile din retea, cele mai noi intai. Null = nu s-a putut citi. */
export async function campaniileDinRetea(): Promise<RandRetea[] | null> {
  const key = process.env.RETEA_KEY;
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${RETEA_URL}/api/admin/comenzi`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; comenzi?: RandRetea[] };
    return json.comenzi || [];
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Campania din retea pentru o comanda de aici. */
export async function campaniaPentruComanda(
  reference: string | null | undefined,
  email: string | null | undefined,
): Promise<RezultatRetea> {
  if (!process.env.RETEA_KEY) return { stare: "neconfigurat" };
  const toate = await campaniileDinRetea();
  if (!toate) return { stare: "eroare", mesaj: "reteaua nu a raspuns" };

  if (reference) {
    const exact = toate.find((c) => c.comanda_externa && c.comanda_externa === reference);
    if (exact) return { stare: "gasita", campanie: transforma(exact, "referinta") };
  }
  const e = (email || "").trim().toLowerCase();
  if (e) {
    const dupaEmail = toate
      .filter((c) => (c.email || "").trim().toLowerCase() === e)
      .sort((a, b) => (b.creata_la || "").localeCompare(a.creata_la || ""));
    if (dupaEmail[0]) return { stare: "gasita", campanie: transforma(dupaEmail[0], "email") };
  }
  return { stare: "negasita" };
}

/** Eticheta starii din retea, pe intelesul nostru. */
export function etichetaStareRetea(stare: string): string {
  switch (stare) {
    case "noua":
      return "creată, fără material";
    case "material":
      return "cu material, nepublicată";
    case "publicata":
      return "în publicare / publicată";
    case "raportata":
      return "raport trimis";
    default:
      return stare;
  }
}
