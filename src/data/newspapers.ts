export interface Newspaper {
  name: string;
  region: "Moldova" | "Transilvania" | "Muntenia" | "Banat" | "Național";
  type: "local" | "national" | "tematic";
  county?: string;
  url?: string;
}

// NOTE: Această listă este folosită DOAR în admin panel (protejat)
// și pentru generarea PDF-ului trimis clienților care completează lead-form-ul.
// NU este expusă pe nicio pagină publică indexabilă de Google.
export const NEWSPAPERS: Newspaper[] = [
  { name: "Ziar Național 1", region: "Național", type: "national" },
  { name: "Ziar Național 2", region: "Național", type: "national" },
  { name: "Ziar Național 3", region: "Național", type: "national" },
  { name: "Ziar Național 4", region: "Național", type: "national" },
  { name: "Ziar Național 5", region: "Național", type: "national" },
  { name: "Ziar Național 6", region: "Național", type: "national" },
  { name: "Ziar Național 7", region: "Național", type: "national" },
  { name: "Ziar Național 8", region: "Național", type: "national" },
  { name: "Ziar Național 9", region: "Național", type: "national" },
  // Moldova (10)
  { name: "Ziar Iași", region: "Moldova", type: "local", county: "Iași" },
  { name: "Ziar Bacău", region: "Moldova", type: "local", county: "Bacău" },
  { name: "Ziar Botoșani", region: "Moldova", type: "local", county: "Botoșani" },
  { name: "Ziar Vaslui", region: "Moldova", type: "local", county: "Vaslui" },
  { name: "Ziar Suceava", region: "Moldova", type: "local", county: "Suceava" },
  { name: "Ziar Neamț", region: "Moldova", type: "local", county: "Neamț" },
  { name: "Ziar Galați", region: "Moldova", type: "local", county: "Galați" },
  { name: "Ziar Vrancea", region: "Moldova", type: "local", county: "Vrancea" },
  { name: "Ziar Brăila", region: "Moldova", type: "local", county: "Brăila" },
  { name: "Ziar Buzău", region: "Moldova", type: "local", county: "Buzău" },
  // Transilvania (10)
  { name: "Ziar Cluj", region: "Transilvania", type: "local", county: "Cluj" },
  { name: "Ziar Brașov", region: "Transilvania", type: "local", county: "Brașov" },
  { name: "Ziar Sibiu", region: "Transilvania", type: "local", county: "Sibiu" },
  { name: "Ziar Mureș", region: "Transilvania", type: "local", county: "Mureș" },
  { name: "Ziar Alba", region: "Transilvania", type: "local", county: "Alba" },
  { name: "Ziar Bihor", region: "Transilvania", type: "local", county: "Bihor" },
  { name: "Ziar Maramureș", region: "Transilvania", type: "local", county: "Maramureș" },
  { name: "Ziar Satu Mare", region: "Transilvania", type: "local", county: "Satu Mare" },
  { name: "Ziar Hunedoara", region: "Transilvania", type: "local", county: "Hunedoara" },
  { name: "Ziar Sălaj", region: "Transilvania", type: "local", county: "Sălaj" },
  // Muntenia + București (10)
  { name: "Ziar București 1", region: "Muntenia", type: "local", county: "București" },
  { name: "Ziar București 2", region: "Muntenia", type: "local", county: "București" },
  { name: "Ziar Prahova", region: "Muntenia", type: "local", county: "Prahova" },
  { name: "Ziar Dâmbovița", region: "Muntenia", type: "local", county: "Dâmbovița" },
  { name: "Ziar Argeș", region: "Muntenia", type: "local", county: "Argeș" },
  { name: "Ziar Ilfov", region: "Muntenia", type: "local", county: "Ilfov" },
  { name: "Ziar Giurgiu", region: "Muntenia", type: "local", county: "Giurgiu" },
  { name: "Ziar Călărași", region: "Muntenia", type: "local", county: "Călărași" },
  { name: "Ziar Ialomița", region: "Muntenia", type: "local", county: "Ialomița" },
  { name: "Ziar Teleorman", region: "Muntenia", type: "local", county: "Teleorman" },
  // Banat + Oltenia (11)
  { name: "Ziar Timiș", region: "Banat", type: "local", county: "Timiș" },
  { name: "Ziar Arad", region: "Banat", type: "local", county: "Arad" },
  { name: "Ziar Caraș-Severin", region: "Banat", type: "local", county: "Caraș-Severin" },
  { name: "Ziar Dolj", region: "Banat", type: "local", county: "Dolj" },
  { name: "Ziar Gorj", region: "Banat", type: "local", county: "Gorj" },
  { name: "Ziar Mehedinți", region: "Banat", type: "local", county: "Mehedinți" },
  { name: "Ziar Olt", region: "Banat", type: "local", county: "Olt" },
  { name: "Ziar Vâlcea", region: "Banat", type: "local", county: "Vâlcea" },
  { name: "Ziar Constanța", region: "Muntenia", type: "local", county: "Constanța" },
  { name: "Ziar Tulcea", region: "Muntenia", type: "local", county: "Tulcea" },
  { name: "Ziar Covasna", region: "Transilvania", type: "local", county: "Covasna" },
];

export const REGION_COUNTS = {
  Moldova: NEWSPAPERS.filter((n) => n.region === "Moldova").length,
  Transilvania: NEWSPAPERS.filter((n) => n.region === "Transilvania").length,
  Muntenia: NEWSPAPERS.filter((n) => n.region === "Muntenia").length,
  Banat: NEWSPAPERS.filter((n) => n.region === "Banat").length,
  Național: NEWSPAPERS.filter((n) => n.region === "Național").length,
};
