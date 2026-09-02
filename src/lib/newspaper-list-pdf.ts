import { NEWSPAPERS } from "@/data/newspapers";
import { buildReportPdf } from "@/lib/report-files";
import { SITE } from "@/data/site";

/**
 * Lista retelei ca PDF, pentru cine vrea s-o pastreze sau s-o duca intr-o
 * sedinta.
 *
 * De ce exista: omul care cumpara publicare in presa nu decide singur. Are un
 * sef, un contabil, un asociat. Pagina de pe site nu se poate trimite pe
 * WhatsApp ca dovada, dar un PDF cu 51 de linkuri, da — si ajunge exact la
 * omul care semneaza. Generat din ACELEASI date ca pagina si ca emailul
 * (data/newspapers.ts), deci nu are cum sa ramana in urma.
 */
export const LIST_PDF_FILENAME = "Reteaua-MediaExpres-50-ziare.pdf";

const REGION_ORDER = [
  "Național",
  "Moldova",
  "Transilvania",
  "Muntenia",
  "Banat",
] as const;

/** Cifra din reclame si contracte; in date pot fi mai multe. */
const OFFICIAL_TOTAL = 50;

export function buildNewspaperListPdf(): Buffer {
  const bonus = NEWSPAPERS.length - OFFICIAL_TOTAL;
  const hasPunycode = NEWSPAPERS.some((n) => n.url.includes("xn--"));

  // Ordonate pe regiuni, ca in pagina: cine cauta "ziarul din judetul meu"
  // il gaseste unde se asteapta, nu intr-o insiruire alfabetica de 51.
  const entries = REGION_ORDER.flatMap((region) =>
    NEWSPAPERS.filter((n) => n.region === region)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "ro"))
      .map((n) => ({
        url: n.url,
        title: n.county ? `${n.name} — ${n.county}` : `${n.name} — ${region}`,
      })),
  );

  return buildReportPdf({
    entries,
    date: new Date(),
    siteName: SITE.name,
    siteUrl: SITE.url,
    subtitle: "Reteaua de ziare — lista completa",
    countLabel: "Publicatii in retea",
    intro: [
      "",
      "Fiecare adresa de mai jos e un site real, activ, cu pagina de Facebook asociata.",
      "Poti deschide oricare dintre ele acum, inainte sa comanzi ceva.",
      "",
      // Cifra oficiala e 50; in retea sunt mai multe. Nu ascundem diferenta —
      // cititorul numara oricum linkurile si ar gasi doua cifre care nu se
      // potrivesc, iar asta strica exact increderea pe care lista o cladeste.
      ...(bonus > 0
        ? [
            `Oferta vorbeste de 50 de ziare. In lista sunt ${NEWSPAPERS.length}: publicam pe toate,`,
            `${bonus === 1 ? "unul e" : `${bonus} sunt`} bonus.`,
            "",
          ]
        : []),
      // Domeniile cu diacritice se scriu tehnic cu "xn--". Fara randul asta,
      // omul care verifica lista crede ca a dat peste un link stricat.
      ...(hasPunycode
        ? [
            'Adresele care incep cu "xn--" sunt scrierea tehnica a domeniilor cu diacritice',
            "(ex. Timis Expres). Se deschid normal, copiate in browser.",
            "",
          ]
        : []),
      "Un articol publicat pe toata reteaua costa 500 lei, cu factura fiscala, si apare in",
      "maximum 12 ore lucratoare de la confirmarea platii. Articolul ramane permanent online.",
      "",
      `Comenzi si intrebari: ${SITE.email} | ${SITE.phone}`,
      "",
    ],
  });
}
