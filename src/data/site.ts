export const SITE = {
  name: "MediaExpres",
  domain: "mediaexpress.ro",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://mediaexpress.ro",
  tagline: "Articolul tău în 50 de ziare românești în 224h lucrătoare lucrătoare",
  description:
    "Serviciu de distribuție comunicate de presă pe 50 de ziare românești + 50 pagini Facebook. Livrare în 224h lucrătoare lucrătoare, raport PDF, linkuri permanente.",
  email: "contact@mediaexpress.ro",
  phone: "+40 758 169 388",
  // Acelasi numar, in formatul cerut de wa.me: prefix de tara fara "+" si fara spatii.
  whatsapp: "40758169388",
  address: "București, România",
  schedule: "Luni – Vineri, 09:00 – 18:00",
  social: {
    facebook: "https://facebook.com/mediaexpres",
    linkedin: "https://linkedin.com/company/mediaexpres",
  },
  // Datele de plata prin transfer bancar (OP). Apar in emailul cu lista si
  // oriunde oferim plata prin OP — factura pentru OP se emite manual.
  billing: {
    company: "LEGIO WEB DEVELOPMENT TOOLS S.R.L.",
    iban: "RO15BTRLRONCRT0652757201",
    bank: "Banca Transilvania",
  },
};

export const NAV_LINKS = [
  { href: "/", label: "Acasă" },
  { href: "/pachete", label: "Pachete" },
  // Landingul reclamei. Un lead a scris ca a vazut reclama, a intrat pe site
  // si nu a mai gasit oferta — pagina nu era nicaieri in meniu.
  { href: "/oferta-500", label: "Ofertă 500 lei" },
  { href: "/reteaua-noastra", label: "Rețeaua noastră" },
  { href: "/blog", label: "Blog" },
  { href: "/despre", label: "Despre" },
  { href: "/contact", label: "Contact" },
];

export const FOOTER_LINKS = {
  servicii: [
    { href: "/pachete#standard", label: "Pachete Standard" },
    { href: "/pachete#cazino", label: "Pachete Cazino" },
    { href: "/pachete#abonamente", label: "Abonamente lunare" },
    { href: "/generator-comunicat", label: "Generator AI gratuit" },
    { href: "/sabloane", label: "Șabloane comunicate" },
    { href: "/audit-mentiuni", label: "Audit mențiuni presă" },
    { href: "/oferta", label: "Ofertă advertoriale" },
    { href: "/comanda", label: "Comandă articol" },
  ],
  companie: [
    { href: "/despre", label: "Despre noi" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
    { href: "/reteaua-noastra", label: "Rețeaua noastră" },
  ],
  legal: [
    { href: "/legal/termeni", label: "Termeni și condiții" },
    { href: "/legal/confidentialitate", label: "Politica de confidențialitate" },
    { href: "/legal/cookies", label: "Politica de cookies" },
    { href: "/legal/gdpr", label: "GDPR" },
  ],
};

export const STATS = [
  { value: "50+", label: "ziare partenere" },
  { value: "50", label: "pagini Facebook" },
  { value: "24h lucrătoare", label: "timp de livrare" },
  { value: "10k+", label: "articole publicate" },
];
