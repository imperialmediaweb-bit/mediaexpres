export type PackageCategory = "standard" | "casino";

export interface Package {
  id: string;
  name: string;
  tagline: string;
  price: number;
  currency: "RON";
  newspapers: number;
  reach: string;
  category: PackageCategory;
  featured?: boolean;
  badge?: string;
  highlights: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: "Bronze" | "Silver" | "Gold" | "Platinum" | "Promo Lunar";
  distributionsPerMonth: number;
  newspapersPerDistribution: 50;
  priceStandard: number;
  priceCasino: number;
  featured?: boolean;
  description: string;
}

const COMMON_HIGHLIGHTS = [
  "Distribuție automată pe Facebook",
  "Link-uri livrate în 4h",
  "Raport PDF cu toate URL-urile",
  "Publicare permanent online",
];

export const STANDARD_PACKAGES: Package[] = [
  {
    id: "local",
    name: "Local",
    tagline: "Acoperire județeană",
    price: 150,
    currency: "RON",
    newspapers: 1,
    reach: "1 ziar județean la alegere",
    category: "standard",
    highlights: [
      "1 articol pe 1 ziar județean (la alegerea clientului)",
      "Distribuție pe pagina de Facebook asociată",
      "Link livrat în 4h",
      "Raport cu URL-ul articolului",
      "Permanent online",
    ],
  },
  {
    id: "regional",
    name: "Regional",
    tagline: "Zonă întreagă acoperită",
    price: 500,
    currency: "RON",
    newspapers: 10,
    reach: "10 ziare dintr-o zonă (Moldova / Transilvania / Muntenia / Banat)",
    category: "standard",
    highlights: [
      "1 articol pe 10 ziare dintr-o zonă geografică",
      "Distribuție pe paginile de Facebook asociate",
      "Linkuri livrate în 4h",
      "Raport PDF cu toate URL-urile",
      "Permanent online",
    ],
  },
  {
    id: "national",
    name: "Național 50",
    tagline: "Cel mai popular — maximă acoperire",
    price: 1500,
    currency: "RON",
    newspapers: 50,
    reach: "41 ziare locale + 9 naționale",
    category: "standard",
    featured: true,
    badge: "Cel mai popular",
    highlights: [
      "1 articol pe 50 de ziare (41 locale + 9 naționale)",
      "Variantă unică pe fiecare ziar — zero conținut duplicat",
      "Distribuție pe 50 pagini Facebook",
      "Linkuri livrate în 4h",
      "Raport PDF complet",
      "Permanent online",
      "50 backlinks SEO",
    ],
  },
];

export const CASINO_PACKAGES: Package[] = [
  {
    id: "cazino-local",
    name: "Cazino Local",
    tagline: "iGaming • pariuri • local",
    price: 300,
    currency: "RON",
    newspapers: 1,
    reach: "1 ziar județean",
    category: "casino",
    highlights: [
      "1 articol pe 1 ziar județean",
      "Distribuție Facebook",
      "Link livrat în 4h + raport",
      "Permanent online",
    ],
  },
  {
    id: "cazino-regional",
    name: "Cazino Regional",
    tagline: "iGaming • pariuri • zonă",
    price: 900,
    currency: "RON",
    newspapers: 10,
    reach: "10 ziare dintr-o zonă",
    category: "casino",
    highlights: [
      "1 articol pe 10 ziare",
      "Distribuție Facebook",
      "Linkuri livrate în 4h + raport",
      "Permanent online",
    ],
  },
  {
    id: "cazino-national",
    name: "Cazino Național",
    tagline: "iGaming • pariuri • maximă acoperire",
    price: 2500,
    currency: "RON",
    newspapers: 50,
    reach: "41 locale + 9 naționale",
    category: "casino",
    featured: true,
    badge: "Recomandat iGaming",
    highlights: [
      "1 articol pe 50 de ziare",
      "Distribuție pe 50 pagini Facebook",
      "Linkuri livrate în 4h",
      "Raport PDF complet",
      "Permanent online",
    ],
  },
];

// Pachete promo, disponibile doar prin landing page-uri dedicate (nu apar in /pachete).
export const PROMO_PACKAGES: Package[] = [
  {
    id: "promo-50",
    name: "Ofertă 50 de ziare",
    tagline: "Ofertă limitată — acoperire națională",
    price: 500,
    currency: "RON",
    newspapers: 50,
    reach: "41 ziare locale + 9 naționale",
    category: "standard",
    highlights: [
      "1 articol pe 50 de ziare (41 locale + 9 naționale)",
      "Variantă unică pe fiecare ziar — zero conținut duplicat",
      "Distribuție pe 50 pagini Facebook",
      "Linkuri livrate în 4h",
      "Raport PDF complet cu toate URL-urile",
      "Permanent online",
      "50 backlinks SEO dofollow",
    ],
  },
  {
    id: "promo-50-cazino",
    name: "Ofertă 50 de ziare — Cazino",
    tagline: "iGaming / pariuri — tarif dublu",
    price: 1000,
    currency: "RON",
    newspapers: 50,
    reach: "41 ziare locale + 9 naționale",
    category: "casino",
    highlights: [
      "1 articol pe 50 de ziare (41 locale + 9 naționale)",
      "Variantă unică pe fiecare ziar — zero conținut duplicat",
      "Distribuție pe 50 pagini Facebook",
      "Linkuri livrate în 4h",
      "Raport PDF complet cu toate URL-urile",
      "Permanent online",
      "50 backlinks SEO dofollow",
    ],
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "bronze",
    name: "Bronze",
    distributionsPerMonth: 1,
    newspapersPerDistribution: 50,
    priceStandard: 1300,
    priceCasino: 2300,
    description: "1 articol × 50 ziare pe lună",
  },
  {
    id: "silver",
    name: "Silver",
    distributionsPerMonth: 2,
    newspapersPerDistribution: 50,
    priceStandard: 2400,
    priceCasino: 4400,
    description: "2 articole × 50 ziare pe lună",
  },
  {
    id: "gold",
    name: "Gold",
    distributionsPerMonth: 4,
    newspapersPerDistribution: 50,
    priceStandard: 4500,
    priceCasino: 8500,
    featured: true,
    description: "4 articole × 50 ziare pe lună",
  },
  {
    id: "platinum",
    name: "Platinum",
    distributionsPerMonth: 8,
    newspapersPerDistribution: 50,
    priceStandard: 8000,
    priceCasino: 15000,
    description: "8 articole × 50 ziare pe lună",
  },
];

// Abonament promotional, disponibil doar prin landingul /oferta-500.
// NU apare in SUBSCRIPTION_PLANS ca sa nu fie afisat pe /pachete langa
// planurile la pret intreg.
export const PROMO_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "promo-lunar",
    name: "Promo Lunar",
    distributionsPerMonth: 1,
    newspapersPerDistribution: 50,
    // Mai ieftin decat plata unica (500 / 1.000) — stimulentul de abonare.
    priceStandard: 400,
    priceCasino: 800,
    description: "1 articol × 50 ziare în fiecare lună — preț promoțional",
  },
];

/** Cauta planul dupa id, inclusiv planurile promo nelistate public. */
export function findSubscriptionPlanById(
  id: string,
): SubscriptionPlan | undefined {
  return [...SUBSCRIPTION_PLANS, ...PROMO_SUBSCRIPTION_PLANS].find(
    (p) => p.id === id,
  );
}

export const PRICING_NOTE =
  "Raportul include linkurile și screenshot-urile articolelor publicate pe cele 50 de site-uri. Distribuția pe Facebook este inclusă automat în toate pachetele, dar statisticile paginilor de Facebook nu pot fi colectate în raport.";

export const SUBSCRIPTION_BENEFITS = [
  "Distribuție Facebook inclusă automat",
  "Raport PDF lunar consolidat",
  "Prioritate la publicare",
  "Suport dedicat pentru abonamente",
];

export function getAllPackages(): Package[] {
  return [...STANDARD_PACKAGES, ...CASINO_PACKAGES];
}

export function findPackageById(id: string): Package | undefined {
  return [...getAllPackages(), ...PROMO_PACKAGES].find((p) => p.id === id);
}
