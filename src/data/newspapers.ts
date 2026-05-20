export interface Newspaper {
  name: string;
  region: "Moldova" | "Transilvania" | "Muntenia" | "Banat" | "Național";
  type: "local" | "national" | "tematic";
  county?: string;
  city?: string;
  url: string;
}

// Rețeaua MediaExpres — 41 ziare locale (câte unul per județ) + 9 ziare naționale = 50 total
// Toate sunt domenii .ro proprii, indexate Google.
export const NEWSPAPERS: Newspaper[] = [
  // Moldova (10)
  { name: "Botoșani Expres", region: "Moldova", type: "local", county: "Botoșani", city: "Botoșani", url: "https://botosaniexpres.ro" },
  { name: "Iași Expres", region: "Moldova", type: "local", county: "Iași", city: "Iași", url: "https://iasiexpres.ro" },
  { name: "Suceava Expres", region: "Moldova", type: "local", county: "Suceava", city: "Suceava", url: "https://suceavaexpres.ro" },
  { name: "Galați Expres", region: "Moldova", type: "local", county: "Galați", city: "Galați", url: "https://galatiexpres.ro" },
  { name: "Neamț Expres", region: "Moldova", type: "local", county: "Neamț", city: "Piatra Neamț", url: "https://neamtexpres.ro" },
  { name: "Vaslui Expres", region: "Moldova", type: "local", county: "Vaslui", city: "Vaslui", url: "https://vasluiexpres.ro" },
  { name: "Vrancea Expres", region: "Moldova", type: "local", county: "Vrancea", city: "Focșani", url: "https://vranceaexpres.ro" },
  { name: "Bacău Expres", region: "Moldova", type: "local", county: "Bacău", city: "Bacău", url: "https://bacauexpress.ro" },
  { name: "Buzău Expres", region: "Moldova", type: "local", county: "Buzău", city: "Buzău", url: "https://buzauexpres.ro" },
  { name: "Brăila Expres", region: "Moldova", type: "local", county: "Brăila", city: "Brăila", url: "https://brailaexpres.ro" },

  // Transilvania (13)
  { name: "Cluj Expres", region: "Transilvania", type: "local", county: "Cluj", city: "Cluj-Napoca", url: "https://clujexpres.ro" },
  { name: "Brașov Expres", region: "Transilvania", type: "local", county: "Brașov", city: "Brașov", url: "https://brasovexpress.ro" },
  { name: "Sibiu Expres", region: "Transilvania", type: "local", county: "Sibiu", city: "Sibiu", url: "https://sibiuexpres.ro" },
  { name: "Mureș Expres", region: "Transilvania", type: "local", county: "Mureș", city: "Târgu Mureș", url: "https://muresexpres.ro" },
  { name: "Alba Expres", region: "Transilvania", type: "local", county: "Alba", city: "Alba Iulia", url: "https://albaexpres.ro" },
  { name: "Bihor Expres", region: "Transilvania", type: "local", county: "Bihor", city: "Oradea", url: "https://bihorexpres.ro" },
  { name: "Maramureș Expres", region: "Transilvania", type: "local", county: "Maramureș", city: "Baia Mare", url: "https://maramuresexpres.ro" },
  { name: "Satu Mare Expres", region: "Transilvania", type: "local", county: "Satu Mare", city: "Satu Mare", url: "https://satu-marexpres.ro" },
  { name: "Hunedoara Expres", region: "Transilvania", type: "local", county: "Hunedoara", city: "Deva", url: "https://hunedoaraexpres.ro" },
  { name: "Sălaj Expres", region: "Transilvania", type: "local", county: "Sălaj", city: "Zalău", url: "https://salajexpress.ro" },
  { name: "Bistrița Expres", region: "Transilvania", type: "local", county: "Bistrița-Năsăud", city: "Bistrița", url: "https://bistrita-nasaudexpres.ro" },
  { name: "Covasna Expres", region: "Transilvania", type: "local", county: "Covasna", city: "Sfântu Gheorghe", url: "https://covasnaexpres.ro" },
  { name: "Harghita Expres", region: "Transilvania", type: "local", county: "Harghita", city: "Miercurea Ciuc", url: "https://harghitaexpres.ro" },

  // Muntenia + București + Dobrogea (11)
  { name: "București Expres", region: "Muntenia", type: "local", county: "București", city: "București", url: "https://bucurestiexpres.ro" },
  { name: "Ilfov Expres", region: "Muntenia", type: "local", county: "Ilfov", city: "Buftea", url: "https://ilfovexpres.ro" },
  { name: "Prahova Expres", region: "Muntenia", type: "local", county: "Prahova", city: "Ploiești", url: "https://prahovaexpres.ro" },
  { name: "Dâmbovița Expres", region: "Muntenia", type: "local", county: "Dâmbovița", city: "Târgoviște", url: "https://dambovitaexpress.ro" },
  { name: "Argeș Expres", region: "Muntenia", type: "local", county: "Argeș", city: "Pitești", url: "https://argesexpress.ro" },
  { name: "Teleorman Expres", region: "Muntenia", type: "local", county: "Teleorman", city: "Alexandria", url: "https://teleormanexpres.ro" },
  { name: "Giurgiu Expres", region: "Muntenia", type: "local", county: "Giurgiu", city: "Giurgiu", url: "https://giurgiuexpres.ro" },
  { name: "Călărași Expres", region: "Muntenia", type: "local", county: "Călărași", city: "Călărași", url: "https://calarasiexpres.ro" },
  { name: "Ialomița Expres", region: "Muntenia", type: "local", county: "Ialomița", city: "Slobozia", url: "https://ialomitaexpres.ro" },
  { name: "Constanța Expres", region: "Muntenia", type: "local", county: "Constanța", city: "Constanța", url: "https://xn--constanaexpres-mbf.ro" },
  { name: "Tulcea Expres", region: "Muntenia", type: "local", county: "Tulcea", city: "Tulcea", url: "https://tulceaexpres.ro" },

  // Banat + Oltenia (8)
  { name: "Timiș Expres", region: "Banat", type: "local", county: "Timiș", city: "Timișoara", url: "https://xn--timiexpres-xxd.ro" },
  { name: "Arad Expres", region: "Banat", type: "local", county: "Arad", city: "Arad", url: "https://aradexpres.ro" },
  { name: "Caraș-Severin Expres", region: "Banat", type: "local", county: "Caraș-Severin", city: "Reșița", url: "https://caras-severinexpres.ro" },
  { name: "Dolj Expres", region: "Banat", type: "local", county: "Dolj", city: "Craiova", url: "https://doljexpres.ro" },
  { name: "Gorj Expres", region: "Banat", type: "local", county: "Gorj", city: "Târgu Jiu", url: "https://gorjexpres.ro" },
  { name: "Mehedinți Expres", region: "Banat", type: "local", county: "Mehedinți", city: "Drobeta-Turnu Severin", url: "https://mehedintiexpres.ro" },
  { name: "Olt Expres", region: "Banat", type: "local", county: "Olt", city: "Slatina", url: "https://oltexpres.ro" },
  { name: "Vâlcea Expres", region: "Banat", type: "local", county: "Vâlcea", city: "Râmnicu Vâlcea", url: "https://valceaexpres.ro" },

  // Naționale (9)
  { name: "România Expres", region: "Național", type: "national", url: "https://romaniaexpres.ro" },
  { name: "AcuNews", region: "Național", type: "national", url: "https://acunews.ro" },
  { name: "Metro News", region: "Național", type: "national", url: "https://metronews.ro" },
  { name: "Lider News", region: "Național", type: "national", url: "https://lidernews.ro" },
  { name: "Point News", region: "Național", type: "national", url: "https://pointnews.ro" },
  { name: "Legio News", region: "Național", type: "national", url: "https://legionews.ro" },
  { name: "Epoch Daily", region: "Național", type: "national", url: "https://epochdaily.ro" },
  { name: "România Leak", region: "Național", type: "national", url: "https://romanialeak.ro" },
  { name: "Diaspora News", region: "Național", type: "national", url: "https://diasporanews.ro" },
];

export const REGION_COUNTS = {
  Moldova: NEWSPAPERS.filter((n) => n.region === "Moldova").length,
  Transilvania: NEWSPAPERS.filter((n) => n.region === "Transilvania").length,
  Muntenia: NEWSPAPERS.filter((n) => n.region === "Muntenia").length,
  Banat: NEWSPAPERS.filter((n) => n.region === "Banat").length,
  Național: NEWSPAPERS.filter((n) => n.region === "Național").length,
};
