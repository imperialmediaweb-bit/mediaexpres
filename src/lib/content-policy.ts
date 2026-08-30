/**
 * Declaratia de continut pe care clientul o bifeaza cand trimite materialul.
 *
 * Nu e o formalitate juridica pusa de forma. A venit o comanda cu un articol
 * care prezenta un "tratament" pentru cancer — regim de sucuri, apa alcalina,
 * fara mancare solida — iar problema s-a vazut dupa incasare. Returnarea
 * banilor prin Stripe dureaza si trece prin contabilitate, deci intrebarea
 * trebuie pusa INAINTE de plata, iar raspunsul trebuie sa ramana scris langa
 * comanda: daca declaratia e falsa, banii nu se mai restituie (art. 4 din
 * Termeni si conditii).
 *
 * Textul e unul singur, importat peste tot — formular OP, formular de articol,
 * chat, intake — ca sa nu ajunga sa difere de la o pagina la alta.
 */
export const CONTENT_DECLARATION =
  "Declar că articolul nu prezintă cauze, tratamente sau metode de vindecare pentru boli " +
  "(cancer, boli cronice, afecțiuni grave) și nu promovează medicamente, suplimente sau " +
  "terapii ca alternativă la tratamentul medical.";

/** Varianta scurta, pentru chat si alte spatii inguste. */
export const CONTENT_DECLARATION_SHORT =
  "Confirmi că articolul NU prezintă tratamente sau metode de vindecare pentru boli " +
  "(cancer, boli cronice) și nu promovează medicamente ori terapii alternative?";

/** Mesajul cand nu e bifata — acelasi pe client si pe server. */
export const CONTENT_DECLARATION_ERROR =
  "Bifează declarația de conținut ca să poți trimite comanda.";

/** Consecinta, spusa scurt sub bifa. Aceeasi regula ca in Termeni, art. 4. */
export const CONTENT_DECLARATION_WARNING =
  "Dacă declarația nu e adevărată, comanda se anulează, articolul se retrage și suma plătită nu se restituie.";

/**
 * Trierea automata a textului primit, rulata INAINTE sa plece factura.
 *
 * Nu e un cenzor si nu blocheaza comanda: doar opreste factura automata si
 * trimite comanda spre verificare umana. Motivul e strict practic — o data ce
 * factura a plecat si clientul a virat banii, un articol care nu se poate
 * publica devine o restituire prin banca, cu contabilitate si intarziere de
 * saptamani. Cat timp nu s-a miscat niciun leu, un "nu" costa un email.
 *
 * Cuvintele sunt alese dupa cazul real care a declansat regula (un "tratament"
 * pentru cancer cu regim de sucuri si apa alcalina), nu dupa o lista generica
 * de termeni medicali: "spital" sau "medic" singure nu inseamna nimic.
 */
const RISKY = [
  "cancer", "tumor", "tumoare", "tumori", "metastaz", "leucemi", "hiv", "sida",
  "diabet", "scleroz", "alzheimer", "hepatit", "psoriazis",
  "vindec", "tratament", "terapi", "remediu", "leac", "chimioterap",
  "homeopat", "naturist", "apă alcalină", "apa alcalina", "detoxifi",
];

/** Un semnal singur nu e destul; boala + promisiune de vindecare, da. */
const DISEASE = new Set([
  "cancer", "tumor", "tumoare", "tumori", "metastaz", "leucemi", "hiv", "sida",
  "diabet", "scleroz", "alzheimer", "hepatit", "psoriazis",
]);

export interface ContentScreening {
  /** Comanda are nevoie de ochi de om inainte sa plece factura. */
  flagged: boolean;
  /** Termenii gasiti, pentru alerta din email. */
  hits: string[];
  /** De ce a fost oprita — apare in alerta, ca sa nu cauti tu motivul. */
  reason: string | null;
}

/**
 * A doua categorie: lucruri interzise care nu au nevoie de perechi.
 *
 * Aici un singur cuvant e destul, pentru ca nu exista varianta nevinovata a
 * unui articol care vinde acte false sau steroizi. Lista e scurta si concreta
 * — nu incearca sa acopere tot codul penal, doar ce ajunge in mod real intr-un
 * comunicat de presa platit.
 */
const FORBIDDEN: { word: string; reason: string }[] = [
  { word: "diplome false", reason: "acte/diplome false" },
  { word: "acte false", reason: "acte/diplome false" },
  { word: "permis auto fals", reason: "acte/diplome false" },
  { word: "carnet de conducere fals", reason: "acte/diplome false" },
  { word: "steroiz", reason: "substanțe interzise" },
  { word: "anabolizant", reason: "substanțe interzise" },
  { word: "canabis", reason: "substanțe interzise" },
  { word: "cannabis", reason: "substanțe interzise" },
  { word: "etnobotanic", reason: "substanțe interzise" },
  { word: "escort", reason: "conținut pentru adulți" },
  { word: "matrimoniale intime", reason: "conținut pentru adulți" },
  { word: "camere video ascunse", reason: "supraveghere ilegală" },
  { word: "spionaj telefon", reason: "supraveghere ilegală" },
  { word: "spargere parol", reason: "activitate ilegală" },
  { word: "carduri clonate", reason: "activitate ilegală" },
  { word: "bani rapizi garantat", reason: "schemă financiară" },
  { word: "investiție garantată", reason: "schemă financiară" },
  { word: "investitie garantata", reason: "schemă financiară" },
  { word: "dublează investiția", reason: "schemă financiară" },
  { word: "câștig garantat", reason: "schemă financiară" },
  { word: "castig garantat", reason: "schemă financiară" },
];

export function screenContent(...parts: (string | null | undefined)[]): ContentScreening {
  const text = parts.filter(Boolean).join("\n").toLowerCase();

  // Interzisele explicite au prioritate: sunt mai grave si mai clare.
  const forbidden = FORBIDDEN.filter((f) => text.includes(f.word));
  if (forbidden.length) {
    return {
      flagged: true,
      hits: forbidden.map((f) => f.word),
      reason: Array.from(new Set(forbidden.map((f) => f.reason))).join(", "),
    };
  }

  const hits = RISKY.filter((w) => text.includes(w));
  const hasDisease = hits.some((w) => DISEASE.has(w));
  const hasClaim = hits.some((w) => !DISEASE.has(w));
  const flagged = hasDisease && hasClaim;
  return {
    flagged,
    hits,
    reason: flagged ? "conținut medical (boală + promisiune de tratare)" : null,
  };
}
