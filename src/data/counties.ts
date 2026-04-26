export interface County {
  slug: string;
  name: string;
  capital: string;
  region: "Moldova" | "Transilvania" | "Muntenia" | "Banat" | "Bucuresti";
}

// 41 judete + Bucuresti. Slug = nume diacritice eliminate, lowercase.
// Folosit pentru pagini SEO /publicare-comunicat-{slug}.
export const COUNTIES: County[] = [
  // Moldova
  { slug: "iasi", name: "Iași", capital: "Iași", region: "Moldova" },
  { slug: "bacau", name: "Bacău", capital: "Bacău", region: "Moldova" },
  { slug: "botosani", name: "Botoșani", capital: "Botoșani", region: "Moldova" },
  { slug: "vaslui", name: "Vaslui", capital: "Vaslui", region: "Moldova" },
  { slug: "suceava", name: "Suceava", capital: "Suceava", region: "Moldova" },
  { slug: "neamt", name: "Neamț", capital: "Piatra Neamț", region: "Moldova" },
  { slug: "galati", name: "Galați", capital: "Galați", region: "Moldova" },
  { slug: "vrancea", name: "Vrancea", capital: "Focșani", region: "Moldova" },

  // Transilvania
  { slug: "cluj", name: "Cluj", capital: "Cluj-Napoca", region: "Transilvania" },
  { slug: "brasov", name: "Brașov", capital: "Brașov", region: "Transilvania" },
  { slug: "sibiu", name: "Sibiu", capital: "Sibiu", region: "Transilvania" },
  { slug: "mures", name: "Mureș", capital: "Târgu Mureș", region: "Transilvania" },
  { slug: "alba", name: "Alba", capital: "Alba Iulia", region: "Transilvania" },
  { slug: "bistrita-nasaud", name: "Bistrița-Năsăud", capital: "Bistrița", region: "Transilvania" },
  { slug: "covasna", name: "Covasna", capital: "Sfântu Gheorghe", region: "Transilvania" },
  { slug: "harghita", name: "Harghita", capital: "Miercurea Ciuc", region: "Transilvania" },
  { slug: "hunedoara", name: "Hunedoara", capital: "Deva", region: "Transilvania" },
  { slug: "salaj", name: "Sălaj", capital: "Zalău", region: "Transilvania" },
  { slug: "satu-mare", name: "Satu Mare", capital: "Satu Mare", region: "Transilvania" },
  { slug: "maramures", name: "Maramureș", capital: "Baia Mare", region: "Transilvania" },

  // Muntenia + Dobrogea
  { slug: "ilfov", name: "Ilfov", capital: "Buftea", region: "Muntenia" },
  { slug: "prahova", name: "Prahova", capital: "Ploiești", region: "Muntenia" },
  { slug: "constanta", name: "Constanța", capital: "Constanța", region: "Muntenia" },
  { slug: "tulcea", name: "Tulcea", capital: "Tulcea", region: "Muntenia" },
  { slug: "braila", name: "Brăila", capital: "Brăila", region: "Muntenia" },
  { slug: "buzau", name: "Buzău", capital: "Buzău", region: "Muntenia" },
  { slug: "ialomita", name: "Ialomița", capital: "Slobozia", region: "Muntenia" },
  { slug: "calarasi", name: "Călărași", capital: "Călărași", region: "Muntenia" },
  { slug: "giurgiu", name: "Giurgiu", capital: "Giurgiu", region: "Muntenia" },
  { slug: "teleorman", name: "Teleorman", capital: "Alexandria", region: "Muntenia" },
  { slug: "dambovita", name: "Dâmbovița", capital: "Târgoviște", region: "Muntenia" },
  { slug: "arges", name: "Argeș", capital: "Pitești", region: "Muntenia" },

  // Banat + Oltenia
  { slug: "timis", name: "Timiș", capital: "Timișoara", region: "Banat" },
  { slug: "arad", name: "Arad", capital: "Arad", region: "Banat" },
  { slug: "bihor", name: "Bihor", capital: "Oradea", region: "Banat" },
  { slug: "caras-severin", name: "Caraș-Severin", capital: "Reșița", region: "Banat" },
  { slug: "dolj", name: "Dolj", capital: "Craiova", region: "Banat" },
  { slug: "gorj", name: "Gorj", capital: "Târgu Jiu", region: "Banat" },
  { slug: "mehedinti", name: "Mehedinți", capital: "Drobeta-Turnu Severin", region: "Banat" },
  { slug: "olt", name: "Olt", capital: "Slatina", region: "Banat" },
  { slug: "valcea", name: "Vâlcea", capital: "Râmnicu Vâlcea", region: "Banat" },

  // Bucuresti
  { slug: "bucuresti", name: "București", capital: "București", region: "Bucuresti" },
];

export function findCountyBySlug(slug: string): County | undefined {
  return COUNTIES.find((c) => c.slug === slug);
}
