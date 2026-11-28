/** 28.11.2026 — pagina din admin deschisa din notificare: Suna / WhatsApp / Email. */
export function linkSunaLead(phone: string, email?: string | null, motiv = "inceput"): string {
  const q = new URLSearchParams({ tel: phone, motiv });
  if (email) q.set("email", email);
  return `/admin/sun?${q.toString()}`;
}
