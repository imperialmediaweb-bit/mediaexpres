export const SITE = {
  name: "MediaExpres",
  domain: "mediaexpress.ro",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://mediaexpress.ro",
  tagline: "Articolul tău în 50 de ziare românești în 24h",
  description:
    "Serviciu de distribuție comunicate de presă pe 50 de ziare românești + 37 pagini Facebook. Livrare în 24h, raport PDF, linkuri permanente.",
  email: "contact@mediaexpress.ro",
  phone: "+40 700 000 000",
  address: "București, România",
  schedule: "Luni – Vineri, 09:00 – 18:00",
  social: {
    facebook: "https://facebook.com/mediaexpres",
    linkedin: "https://linkedin.com/company/mediaexpres",
  },
};

export const NAV_LINKS = [
  { href: "/", label: "Acasă" },
  { href: "/pachete", label: "Pachete" },
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
  { value: "37", label: "pagini Facebook" },
  { value: "24h", label: "timp de livrare" },
  { value: "10k+", label: "articole publicate" },
];
