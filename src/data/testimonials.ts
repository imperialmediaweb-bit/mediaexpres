export interface Testimonial {
  name: string;
  role: string;
  company: string;
  quote: string;
  initials: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Andrei Pop",
    role: "Marketing Manager",
    company: "TechStart București",
    initials: "AP",
    quote:
      "În 24h aveam articolul pe 50 de site-uri, cu raport PDF complet. Pentru lansarea noastră a fost exact ce aveam nevoie — zero bătaie de cap, maximă vizibilitate.",
  },
  {
    name: "Elena Marin",
    role: "PR Specialist",
    company: "Clinica MediLife",
    initials: "EM",
    quote:
      "Am folosit pachetul Național 50 pentru inaugurarea clinicii noastre. Am fost impresionată de rapiditate și de calitatea raportului. Îl folosim constant de atunci.",
  },
  {
    name: "Victor Stoica",
    role: "Fondator",
    company: "BetExpert Romania",
    initials: "VS",
    quote:
      "Pentru industria de iGaming, pachetele de cazino au fost perfecte. Distribuția pe pagini locale + naționale ne-a adus trafic calificat din primele zile.",
  },
];
