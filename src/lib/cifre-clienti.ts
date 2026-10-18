import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * 18.10.2026 — cate firme au publicat prin MediaExpres, numarate din comenzi
 * (nu scrise de mana): firme distincte dupa CUI, sau dupa email cand CUI-ul
 * lipseste, cu comanda platita sau publicata. Fara comenzile de test
 * (sesiuni Stripe cs_test_) si fara cele inca neplatite.
 *
 * Pagina o afiseaza doar de la un prag in sus — o cifra mica ar convinge mai
 * putin decat lipsa ei.
 */
export const PRAG_FIRME = 10;

// Eroarea se arunca DIN cache, ca sa nu fie tinuta minte: la build baza nu e
// accesibila (retea interna Railway), iar un „null" pastrat o ora ascundea
// cifra si dupa pornire.
const numaraCached = unstable_cache(
  async (): Promise<number> => {
    const r = await db.execute(sql`
      select count(distinct coalesce(
        nullif(regexp_replace(lower(coalesce(company_cui, cui, '')), '[^0-9]', '', 'g'), ''),
        lower(email)
      ))::int as n
      from order_submission
      where status in ('paid', 'pending', 'published')
        and stripe_session_id not like 'cs_test_%'
    `);
    const rows = (r as unknown as { rows?: { n: number }[] }).rows ?? (r as unknown as { n: number }[]);
    return Number(rows?.[0]?.n ?? 0);
  },
  ["firme-care-au-publicat-v2"],
  { revalidate: 3600 },
);

export async function firmeCareAuPublicat(): Promise<number | null> {
  try {
    const n = await numaraCached();
    return Number.isFinite(n) ? n : null;
  } catch (err) {
    console.error("[cifre-clienti]", err instanceof Error ? err.message : err);
    return null;
  }
}
