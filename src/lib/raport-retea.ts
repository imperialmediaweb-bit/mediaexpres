import { campaniileDinRetea } from "@/lib/retea";

export type RandRetea = NonNullable<Awaited<ReturnType<typeof campaniileDinRetea>>>[number];

/**
 * 12.11.2026 — campania din rețea a unei comenzi de aici, pentru raportul de
 * pe mediaexpress.ro și pentru e-mailul „campania a pornit". Întâi după
 * referința comenzii; altfel după email, dar doar o campanie creată DUPĂ
 * comanda asta (să nu arătăm sau să nu anunțăm una mai veche a clientului).
 */
export function campaniaComenzii(
  c: { ref: string; email: string; createdAt: Date },
  toate: RandRetea[],
): { rand: RandRetea; exact: boolean } | null {
  const exact = toate.find((x) => x.comanda_externa && x.comanda_externa === c.ref && x.token);
  if (exact) return { rand: exact, exact: true };
  const e = c.email.trim().toLowerCase();
  const dupa = c.createdAt.getTime() - 60 * 60 * 1000;
  const cand = toate
    .filter(
      (x) =>
        x.token &&
        (x.email || "").trim().toLowerCase() === e &&
        x.creata_la &&
        new Date(x.creata_la).getTime() >= dupa,
    )
    .sort((a, b) => (a.creata_la || "").localeCompare(b.creata_la || ""));
  return cand[0] ? { rand: cand[0], exact: false } : null;
}
