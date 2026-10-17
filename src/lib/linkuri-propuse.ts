/**
 * 17.10.2026 — linkurile din articolul generat: pe cuvintele cheie alese de
 * client sau, daca n-a ales, pe 2-3 din cuvintele cheie ale articolului care
 * chiar apar in text. Toate duc spre site-ul clientului; el le confirma sau
 * le schimba in formular.
 */
export function cuvinteAlese(text: string | undefined): string[] {
  return (text || "")
    .split(/[,;\n]/)
    .map((k) => k.trim())
    .filter((k) => k.length >= 3)
    .slice(0, 3);
}

export function linkuriPeCuvinte(cuvinte: string[], siteUrl: string): string {
  return cuvinte.map((k) => `${k} → ${siteUrl}`).join("\n");
}

export function propuneLinkuri(keywords: string[], body: string, siteUrl: string): string {
  const corp = body.toLowerCase();
  const alese = keywords
    .map((k) => k.trim())
    .filter((k, i, all) => k.length >= 3 && corp.includes(k.toLowerCase()) && all.indexOf(k) === i)
    .slice(0, 3);
  return linkuriPeCuvinte(alese, siteUrl);
}
