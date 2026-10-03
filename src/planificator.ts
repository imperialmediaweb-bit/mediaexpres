/**
 * Planificatorul intern (29.09.2026): serverul isi apeleaza singur cronurile,
 * fara sa depinda de un serviciu extern care se poate opri pe tacute (cum s-a
 * intamplat: reamintirile nu mai plecau de o saptamana). Rutele sunt
 * idempotente, deci un apel extern in plus nu strica nimic.
 * Incarcat doar pe Node, din src/instrumentation.ts.
 */
export async function pornestePlanificator() {
  if (process.env.NODE_ENV !== "production") return;
  const g = globalThis as unknown as { __planificator?: boolean };
  if (g.__planificator) return;
  g.__planificator = true;

  const { cheieInternaCron } = await import("@/lib/cron-auth");
  const cheie = cheieInternaCron();
  if (!cheie) {
    console.warn("[planificator] lipseste SESSION_SECRET — cronurile interne nu pornesc");
    return;
  }
  const port = process.env.PORT || "3000";
  const ruleaza = (cale: string) =>
    fetch(`http://127.0.0.1:${port}${cale}`, { method: "POST", headers: { "x-cron-intern": cheie } })
      .then(async (r) => console.log(`[planificator] ${cale} ${r.status} ${(await r.text()).slice(0, 300)}`))
      .catch((e) => console.error(`[planificator] ${cale}:`, e instanceof Error ? e.message : e));

  const MIN = 60 * 1000;
  setTimeout(() => ruleaza("/api/cron/materiale-lipsa"), 1 * MIN);
  setInterval(() => ruleaza("/api/cron/materiale-lipsa"), 5 * MIN);
  setTimeout(() => ruleaza("/api/cron/promo-announce"), 3 * MIN);
  setInterval(() => ruleaza("/api/cron/promo-announce"), 6 * 60 * MIN);
  // Scorurile Moz ale ziarelor noastre: zilnic, dar masoara doar ce e mai
  // vechi de 30 de zile (lib/autoritate-retea.ts).
  setTimeout(() => ruleaza("/api/cron/autoritate-retea"), 2 * MIN);
  setInterval(() => ruleaza("/api/cron/autoritate-retea"), 24 * 60 * MIN);
  // Autoblogul: la 30 de minute; publica doar cand ii vine randul (lib/autoblog.ts).
  setTimeout(() => ruleaza("/api/cron/autoblog"), 4 * MIN);
  setInterval(() => ruleaza("/api/cron/autoblog"), 30 * MIN);
  console.log("[planificator] pornit: materiale-lipsa la 5 minute, promo-announce la 6 ore, autoritate-retea zilnic, autoblog la 30 de minute");
}
