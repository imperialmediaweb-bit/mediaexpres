// Mini case studies pentru pagina /oferta/[token] — social proof cu cifre concrete.
// Adaugă date reale pe măsură ce acumulezi colaborări verificabile.

export interface CaseStudy {
  industry: string;
  industryKeywords: string[];
  package: string;
  result: string;
  metric: string;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    industry: "Imobiliare",
    industryKeywords: ["imobil", "real estate", "developer", "constructii", "rezidential"],
    package: "Național 50",
    result: "47 articole publicate, 12K vizualizări organice, 8 lead-uri calificate în prima săptămână",
    metric: "12.000+ vizualizări",
  },
  {
    industry: "Medical / Clinică privată",
    industryKeywords: ["medical", "clinica", "sanatate", "stomatolog", "farmacie", "spital"],
    package: "Abonament Silver — 3 luni",
    result: "+35% trafic organic pe site, 23 programări noi direct din mențiunile din presă",
    metric: "+35% trafic",
  },
  {
    industry: "iGaming / Cazino",
    industryKeywords: ["cazino", "igaming", "betting", "pariuri", "jocuri", "gambling"],
    package: "Cazino Național — 6 luni",
    result: "Mențiuni indexate Google News, autoritate de domeniu crescută cu 18 puncte în 3 luni",
    metric: "+18 DA în 3 luni",
  },
  {
    industry: "Agenție PR / Comunicare",
    industryKeywords: ["agentie", "pr", "comunicare", "marketing", "branding", "publicitate"],
    package: "Parteneriat reseller",
    result: "12 clienți distribuiți prin rețeaua MediaExpres, marjă 25% per distribuție",
    metric: "12 clienți activi",
  },
];

export function getRelevantCaseStudies(industry: string | null, count = 3): CaseStudy[] {
  if (!industry) return CASE_STUDIES.slice(0, count);
  const lower = industry.toLowerCase();
  const matched = CASE_STUDIES.filter((cs) =>
    cs.industryKeywords.some((kw) => lower.includes(kw))
  );
  const unmatched = CASE_STUDIES.filter((cs) =>
    !cs.industryKeywords.some((kw) => lower.includes(kw))
  );
  return [...matched, ...unmatched].slice(0, count);
}
