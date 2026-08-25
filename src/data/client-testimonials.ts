export interface ClientTestimonial {
  /** Numele afisat public — firma, nu persoana. Asa a cerut clientul. */
  company: string;
  /** Link catre site-ul lui: recomandarea devine si o mentiune utila pentru el. */
  url?: string;
  quote: string;
  /** Ce a cumparat — face recomandarea verificabila, nu decorativa. */
  context?: string;
}

// Recomandari REALE, de la clienti care au platit, publicate cu acordul lor
// scris. Fisier separat de data/testimonials.ts, care contine exemple generice
// afisate pe homepage.
//
// Regula: nu se infrumuseteaza si nu se inventeaza nimic. Textul e al
// clientului, eventual scurtat. O recomandare fabricata se simte, iar
// increderea pierduta costa mai mult decat aduce.
export const CLIENT_TESTIMONIALS: ClientTestimonial[] = [
  {
    company: "RomCut",
    url: "https://romcut.ro",
    quote:
      "Sunteți la înălțime — răspundeți frumos și fără să extrag cuvintele cu cleștele. Sunt unii pe internet... vai vai. Am început-o cu dreptul cu dumneavoastră. Jos pălăria!",
    context: "46 de articole publicate în rețea",
  },
];
