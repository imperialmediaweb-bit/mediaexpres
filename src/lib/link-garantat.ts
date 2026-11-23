const fara = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Linkul catre client sigur in material. Daca HTML-ul are deja un <a> spre
 * domeniul clientului, nu atingem nimic. Altfel: (1) cuvintele din text care
 * formeaza domeniul („Aurul Albinelor" ↔ aurulalbinelor), (2) numele firmei fara
 * SRL/PFA, (3) o fraza la final: „Detalii pe <a>domeniu</a>."
 */
export function cuLinkGarantat(html: string, link: string, firma?: string | null): string {
  let dom = "";
  try {
    dom = new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return html;
  }
  if (new RegExp(`href="https?://(www\\.)?${dom.replace(/\./g, "\\.")}`, "i").test(html)) return html;
  const tinta = fara(dom.split(".")[0]).replace(/[^a-z0-9]/g, "");
  const a = (t: string) => `<a href="${link}">${t}</a>`;
  const paragrafe = html.split(/(<p>[\s\S]*?<\/p>)/);
  const puneIn = (gaseste: (text: string) => string | null): boolean => {
    for (let i = 0; i < paragrafe.length; i++) {
      const b = paragrafe[i];
      if (!b.startsWith("<p>") || b.includes("<a ")) continue;
      const g = gaseste(b);
      if (g) {
        paragrafe[i] = b.replace(g, a(g));
        return true;
      }
    }
    return false;
  };
  // (1) 1-4 cuvinte consecutive care, lipite, dau numele domeniului
  if (tinta.length >= 4 && puneIn((b) => {
    const cuv = b.replace(/<[^>]+>/g, " ").match(new RegExp("[\\p{L}\\p{N}&'-]+", "gu")) || [];
    for (let i = 0; i < cuv.length; i++)
      for (let n = 1; n <= 4 && i + n <= cuv.length; n++) {
        const bucata = cuv.slice(i, i + n);
        if (fara(bucata.join("")).replace(/[^a-z0-9]/g, "") === tinta) {
          const re = new RegExp(bucata.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\S]{0,12}?"), "u");
          const m = b.match(re);
          if (m && !/[<>]/.test(m[0])) return m[0];
        }
      }
    return null;
  })) return paragrafe.join("");
  // (2) numele firmei, fara forma juridica
  const nume = (firma || "").replace(/\b(S\.?R\.?L\.?|S\.?A\.?|P\.?F\.?A\.?|I\.?I\.?|SRL-D)\b/gi, "").replace(/\s+/g, " ").trim();
  if (nume.length >= 3 && puneIn((b) => (b.toLowerCase().includes(nume.toLowerCase()) ? b.substr(b.toLowerCase().indexOf(nume.toLowerCase()), nume.length) : null)))
    return paragrafe.join("");
  // (3) fraza la final
  return `${html}\n<p>Mai multe detalii pe ${a(dom)}.</p>`;
}
