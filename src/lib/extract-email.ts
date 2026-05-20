// Extragere email public de pe site-ul oficial al unei firme.
// Folosit de /api/admin/prospects/discover si /api/extension/prospects.

export const EMAIL_RX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Pagini uzuale de contact pe site-uri romanesti
export const CONTACT_PATHS = ["", "/contact", "/contact.html", "/despre", "/despre-noi", "/echipa"];

// Extrage cel mai bun email de contact de pe site-ul real al firmei.
// Returneaza null daca site-ul nu raspunde sau nu are email.
export async function extractEmailFromSite(domain: string): Promise<string | null> {
  const clean = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const found = new Set<string>();

  for (const path of CONTACT_PATHS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch(`https://${clean}${path}`, {
        signal: ctrl.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MediaExpresBot/1.0; +https://mediaexpress.ro)",
        },
      });
      clearTimeout(timer);
      if (!res.ok) continue;

      const html = await res.text();
      const matches = html.match(EMAIL_RX) || [];
      for (const m of matches) {
        const email = m.toLowerCase();
        if (
          email.includes("example") ||
          email.includes("sentry") ||
          email.includes("wixpress") ||
          email.includes(".png") ||
          email.includes(".jpg") ||
          email.includes("@2x")
        ) {
          continue;
        }
        found.add(email);
      }
      if (found.size > 0 && path === "") break;
    } catch {
      // timeout / DNS fail / cert error — trecem mai departe
    }
  }

  if (found.size === 0) return null;

  const all = [...found];
  const baseDomain = clean.replace(/^www\./, "");

  const sameDomain = all.filter((e) => e.split("@")[1]?.includes(baseDomain));
  const pool = sameDomain.length > 0 ? sameDomain : all;
  const priority = ["office@", "contact@", "pr@", "hello@", "info@", "marketing@"];
  for (const p of priority) {
    const hit = pool.find((e) => e.startsWith(p));
    if (hit) return hit;
  }
  return pool[0];
}
