/**
 * Cifrele retelei, intr-un singur loc, cu data masurarii.
 *
 * O cifra adevarata azi devine afirmatie falsa peste trei luni, iar pagina
 * ramane online. De aceea fiecare cifra de aici are `laData`, iar paginile o
 * afiseaza langa ea. Se improspateaza impreuna cu data, niciodata separat.
 *
 * Sursa (13.09.2026): statisticile Meta ale paginii Botosani Expres (28 de
 * zile), Google Search Console pe cele 51 de domenii (28 de zile), baza de
 * date a retelei (articole publicate, arhiva), /admin/facebook (pagini si
 * urmaritori).
 *
 * Ce NU punem pe paginile de vanzare, desi il stim: cititorii unici pe
 * site (~13.800 pe luna, pe toate ziarele). Nu e o cifra rusinoasa, dar
 * langa „50 de ziare" invita la o socoteala care nu ne avantajeaza. La
 * intrebare directa se raspunde cinstit.
 */
export const CIFRE = {
  laData: "13 septembrie 2026",
  perioada: "ultimele 28 de zile",

  /** Reteaua. Cifra OFICIALA e 50 (41 locale + 9 nationale); reteaua are 51
   *  in baza pentru ca Sibiu Expres exista ca site, dar fara domeniu inca. */
  publicatii: 50,
  judete: 41,
  articolePeLuna: 15_000,
  articoleInArhiva: 315_000,
  articolePeZi: 500,

  /** Facebook, toate paginile. */
  paginiFacebook: 46,
  urmaritoriFacebook: 37_323,

  /** Facebook, cea mai citita pagina (Botosani Expres), 28 de zile. */
  botosani: {
    afisari: 2_773_457,
    interactiuni: 107_428,
    crestereFataDeLunaAnterioara: "+106%",
  },

  /** Google Search Console, toate domeniile, 28 de zile. */
  googleAfisari: 47_728,

  /** Moz, masurat 6 septembrie 2026. */
  domainAuthority: 37,
  pageAuthority: 30,
} as const;

/** 2773457 → „2.773.457" */
export function nr(n: number): string {
  return n.toLocaleString("ro-RO");
}

/** 2773457 → „2,77 milioane" */
export function milioane(n: number): string {
  return `${(n / 1_000_000).toFixed(2).replace(".", ",").replace(/0$/, "")} milioane`;
}
