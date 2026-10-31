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
  {
    // 31.10.2026 — trimisa pe email de clinica, ca raspuns la cererea de recenzie.
    company: "Clinica Dr. Allia Dmour — Obstetrică-Ginecologie, Iași",
    url: "https://www.allia-ginecologie.com",
    quote:
      "Am avut o experiență foarte bună cu echipa MediaExpres. Comunicarea a fost promptă și clară, toate detaliile tehnice au fost explicate transparent, iar publicarea s-a realizat exact conform celor stabilite. Am apreciat în mod special seriozitatea, rapiditatea și faptul că am primit raportul complet cu toate publicațiile și linkurile articolelor. O colaborare profesionistă și corectă. Recomand cu încredere!",
    context: "Articol publicat în cele 50 de ziare din rețea",
  },
];
