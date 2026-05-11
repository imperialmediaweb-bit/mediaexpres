// Suppression list — emailuri care NU trebuie să primească niciodată cold outreach.
// Sursă: parteneri existenți (vezi `src/data/social-proof.ts`) + manual.

export const SUPPRESSED_EMAILS = new Set<string>([
  // June (partener)
  "contact@june.ro",
  "office@june.ro",
  "hello@june.ro",
  "info@june.ro",

  // Emblema Grup (partener)
  "office@emblemasolutions.ro",
  "contact@emblemasolutions.ro",
  "office@emblemagroup.ro",
  "contact@emblemagroup.ro",
]);

export function isSuppressed(email: string): boolean {
  return SUPPRESSED_EMAILS.has(email.trim().toLowerCase());
}
