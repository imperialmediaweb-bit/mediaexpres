/**
 * Ritmul de publicare al unei comenzi: cat de repede ies cele 50 de articole.
 *
 * 12.09.2026 — clientul de SEO: „50 de linkuri aparute in aceeasi zi se
 * citesc ca un singur act de cumparare". Pentru el, campania intinsa pe
 * doua saptamani e produsul. Pentru cine anunta un eveniment, tot ce nu e
 * „azi" e prea tarziu. Deci il intrebam, cu explicatia langa fiecare
 * varianta, iar alegerea ajunge pe comanda, in admin si in email — de acolo
 * proprietarul pune esalonarea in platforma de publicare.
 */
export const RITMURI = [
  {
    id: "rapid",
    eticheta: "Rapid — în 12 ore lucrătoare",
    scurt: "comunicate, evenimente, lansări",
    explicatie:
      "Toate cele 50 de articole apar în maximum 12 ore lucrătoare de la plată, eșalonat pe parcursul zilei. Potrivit când ai un eveniment, o lansare sau un comunicat care trebuie să iasă acum.",
    /** Cat cere in platforma de publicare (ore). */
    ore: 12,
  },
  {
    id: "zile3",
    eticheta: "Întins pe 3 zile",
    scurt: "advertorial obișnuit, prezență în presă",
    explicatie:
      "Articolele apar pe rând, pe parcursul a 3 zile lucrătoare, câteva pe oră. Arată ca un flux natural de presă și dă timp fiecărui articol să fie indexat. Potrivit pentru prezență în presă și notorietate.",
    ore: 72,
  },
  {
    id: "sapt2",
    eticheta: "Întins pe 2 săptămâni",
    scurt: "dacă e pentru SEO și linkuri",
    explicatie:
      "Articolele apar treptat, pe parcursul a 2 săptămâni, câteva pe zi. Recomandat dacă scopul e SEO și linkuri: 50 de linkuri apărute în aceeași zi se citesc ca o singură acțiune, iar întinse în timp arată ca plasări normale. Linkurile deja publicate le vezi pe măsură ce apar; raportul final vine când iese ultimul articol.",
    ore: 336,
  },
] as const;

export type RitmId = (typeof RITMURI)[number]["id"];
export const RITM_IDS = RITMURI.map((r) => r.id) as [RitmId, ...RitmId[]];
export const RITM_IMPLICIT: RitmId = "rapid";

export function ritmDupaId(id: string | null | undefined) {
  return RITMURI.find((x) => x.id === id) || RITMURI[0];
}

export function etichetaRitm(id: string | null | undefined): string {
  return ritmDupaId(id).eticheta;
}
