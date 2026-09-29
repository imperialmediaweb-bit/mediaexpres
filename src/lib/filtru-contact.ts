/**
 * Filtrul din chatul client–partener: nimeni nu-si da telefonul, emailul,
 * site-ul sau WhatsApp-ul prin platforma.
 *
 * 29.09.2026 — cerut de proprietar: „dupa comanda... depisteaza daca schimba
 * nr de telefon, emailuri... este interzis". Daca clientul si publicatia se
 * gasesc direct, a doua comanda se face pe langa noi.
 *
 * Mesajul prins NU ajunge la celalalt; ramane la noi, marcat, si adminul
 * primeste alerta. Filtrul e larg intentionat: un fals pozitiv costa o
 * reformulare, o scapare costa clientul.
 */

export type MotivBlocare = "telefon" | "email" | "link" | "aplicatie";

export const ETICHETE_MOTIV: Record<MotivBlocare, string> = {
  telefon: "un număr de telefon",
  email: "o adresă de email",
  link: "o adresă de site",
  aplicatie: "o trimitere la WhatsApp / Telegram / altă aplicație",
};

const CIFRE_CUVINTE: Record<string, string> = {
  zero: "0",
  unu: "1",
  una: "1",
  doi: "2",
  doua: "2",
  trei: "3",
  patru: "4",
  cinci: "5",
  sase: "6",
  sapte: "7",
  opt: "8",
  noua: "9",
};

function faraDiacritice(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** „zero sapte doi..." -> „0 7 2...", ca sa prindem si numerele scrise in litere. */
function cifreDinCuvinte(s: string): string {
  return s.replace(/\b(zero|unu|una|doi|doua|trei|patru|cinci|sase|sapte|opt|noua)\b/g, (m) => CIFRE_CUVINTE[m]);
}

/**
 * @param permise domenii care au voie sa apara (site-ul clientului, adresa
 *   articolului publicat) — fara ele, partenerul n-ar putea spune „am pus
 *   linkul catre firma.ro".
 */
export function verificaContact(text: string, permise: string[] = []): MotivBlocare | null {
  const t = cifreDinCuvinte(faraDiacritice(text));

  // Telefon: 9+ cifre intr-o secventa care are doar separatori intre ele.
  const secvente = t.match(/\+?\d[\d\s.\-/()o]{7,}\d/g) || [];
  for (const s of secvente) {
    const cifre = s.replace(/o/g, "0").replace(/\D/g, "");
    // Doar ce arata a numar romanesc (0.., 40.., 7..): o data cu ora
    // („29.09.2026 10") are si ea 10 cifre, dar incepe altfel.
    if (cifre.length >= 9 && cifre.length <= 14 && /^(0|40|7)/.test(cifre)) return "telefon";
  }

  // Email: clasic, plus „nume at gmail punct com", „nume [at] gmail".
  if (/[a-z0-9._%+-]+\s*(@|\(at\)|\[at\]|\{at\}|\s+at\s+|\s+arond\s+|\s+a rond\s+)\s*[a-z0-9.-]+\s*(\.|\s+punct\s+|\s+dot\s+|\(dot\)|\[dot\])\s*[a-z]{2,}/.test(t)) {
    return "email";
  }
  if (/\b(gmail|yahoo|hotmail|outlook|icloud|protonmail)\b/.test(t)) return "email";

  // Aplicatii si retele prin care s-ar muta discutia.
  if (/\b(whats\s*app|whatsapp|watsap|wapp|telegram|signal|viber|messenger|skype|discord|insta(gram)?|tiktok|linkedin)\b/.test(t)) {
    return "aplicatie";
  }
  if (/(^|\s)@[a-z0-9_.]{3,}/.test(t)) return "aplicatie";

  // Adrese de site, cu exceptia celor permise.
  const permiseCurate = permise.map((d) => d.toLowerCase().replace(/^www\./, "")).filter(Boolean);
  const domenii = t.match(/(https?:\/\/)?(www\.)?[a-z0-9-]+(\s*\.\s*[a-z0-9-]+)*\s*\.\s*(ro|com|net|org|eu|info|biz|md|io|co|online|site|store|shop)\b/g) || [];
  for (const d of domenii) {
    const curat = d.replace(/\s+/g, "").replace(/^https?:\/\//, "").replace(/^www\./, "");
    if (!permiseCurate.some((p) => curat === p || curat.endsWith("." + p))) return "link";
  }
  if (/https?:\/\//.test(t)) {
    const linkuri = t.match(/https?:\/\/[^\s/]+/g) || [];
    for (const l of linkuri) {
      const host = l.replace(/^https?:\/\//, "").replace(/^www\./, "");
      if (!permiseCurate.some((p) => host === p || host.endsWith("." + p))) return "link";
    }
  }

  return null;
}

export function mesajBlocare(m: MotivBlocare): string {
  return `Mesajul n-a fost trimis: conține ${ETICHETE_MOTIV[m]}. Datele de contact nu se schimbă prin platformă — toată discuția rămâne aici, iar noi ne ocupăm de restul.`;
}
