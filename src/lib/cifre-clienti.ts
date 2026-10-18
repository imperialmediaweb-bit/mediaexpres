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

export const firmeCareAuPublicat = unstable_cache(
  async (): Promise<number | null> => {
    try {
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
      const n = Number(rows?.[0]?.n ?? 0);
      return Number.isFinite(n) ? n : null;
    } catch (err) {
      console.error("[cifre-clienti]", err);
      return null;
    }
  },
  ["firme-care-au-publicat"],
  { revalidate: 3600 },
);
