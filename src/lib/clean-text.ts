/**
 * Curatarea textului primit de la clienti.
 *
 * Clientii lipesc articolul din Word, din PDF sau din email, si textul vine cu
 * tot gunoiul de acolo: spatii duble, spatii inaintea virgulelor, randuri care
 * incep cu spatiu, CRLF, siruri de randuri goale. Cand adminul apasa "Copiaza
 * textul" ca sa-l duca in unealta de publicare, tot gunoiul se copiaza cu el
 * si ajunge PE ZIARE — s-a vazut cu ochiul liber la primul articol real.
 *
 * Curatam conservator: nu unim si nu spargem randuri, pentru ca structura pe
 * randuri e a autorului (liste, paragrafe scurte) si nu avem cum sa ghicim
 * intentia. Reparam doar ce e sigur gresit in orice text romanesc.
 */
export function cleanArticleText(raw: string): string {
  return (
    raw
      .replace(/\r\n?/g, "\n")
      // Spatiile invizibile care vin din Word/PDF: non-breaking, zero-width.
      .replace(/[   ]/g, " ")
      .replace(/[​‌‍﻿]/g, "")
      .split("\n")
      .map(
        (line) =>
          line
            .trim()
            // Orice sir de spatii/taburi devine un singur spatiu.
            .replace(/[ \t]{2,}/g, " ")
            // "cuvant , cuvant" -> "cuvant, cuvant" (si pentru . ! ? : ;)
            .replace(/ +([,.;:!?])/g, "$1"),
      )
      .join("\n")
      // Randurile rupte in mijloc de propozitie — marca textului copiat din
      // PDF sau email, unde totul e infasurat la o latime fixa. Le unim doar
      // cand e fara dubiu aceeasi propozitie: randul de sus NU se termina cu
      // punctuatie de final, iar cel de jos incepe cu litera mica. Un titlu,
      // o lista sau un paragraf nou incep cu majuscula, cifra sau liniuta,
      // deci raman neatinse.
      .replace(/([^\s.!?:;…])\n([a-zăâîșțş])/g, "$1 $2")
      // Mai mult de un rand gol la rand nu inseamna nimic in plus.
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Varianta pentru titluri: un singur rand, un singur spatiu intre cuvinte. */
export function cleanTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").replace(/ +([,.;:!?])/g, "$1").trim();
}
