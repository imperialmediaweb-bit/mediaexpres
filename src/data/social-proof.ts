// Parteneri reali / colaborări existente — apar ca trust signals în pitch + pe pagini publice.
// Aceștia NU sunt prospects (nu se trimit emailuri reci), sunt jucători cu care utilizatorul lucrează deja.

export interface Partner {
  name: string;
  type: "pr-agency" | "distribution" | "publication" | "tech";
  website?: string;
  since?: string;
}

export const EXISTING_PARTNERS: Partner[] = [
  // PR agencies cu care colaborăm activ
  {
    name: "June",
    type: "pr-agency",
    website: "https://june.ro",
  },
  {
    name: "Emblema Grup",
    type: "pr-agency",
    website: "https://emblemagroup.ro",
  },

  // Platforme distribuție / press release
  {
    name: "WhitePress",
    type: "distribution",
    website: "https://whitepress.com",
  },

  // Publicații / bloguri
  {
    name: "Blogatu",
    type: "publication",
    website: "https://blogatu.ro",
  },
];

export const PARTNER_NAMES_SHORT = EXISTING_PARTNERS.map((p) => p.name).join(", ");

export function getPartnersByType(type: Partner["type"]): Partner[] {
  return EXISTING_PARTNERS.filter((p) => p.type === type);
}
