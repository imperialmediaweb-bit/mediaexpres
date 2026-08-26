import { SITE } from "@/data/site";

/**
 * Comanda completa purtata ca o conversatie, pas cu pas.
 *
 * De ce exista: omul care intreaba in chat "cum platesc?" primea un raspuns si
 * apoi era lasat singur — trebuia sa inchida chatul, sa gaseasca pagina de
 * oferta, sa reia de la zero. Fiecare pas in plus pierde oameni. Aici raspunde
 * la intrebari SI comanda, fara sa iasa din conversatie.
 *
 * Datele adunate merg la EXACT aceleasi rute ca formularele clasice
 * (/api/checkout pentru card, /api/comanda/transfer pentru OP), deci comanda
 * ajunge in admin identic cu oricare alta. Chatul e doar alta usa spre
 * acelasi flux, nu un flux paralel care ar trebui intretinut separat.
 */

export interface OrderData {
  isCasino: boolean;
  method: "card" | "op" | null;
  email: string;
  contactPhone: string;
  companyName: string;
  companyCui: string;
  companyAddress: string;
  hasArticle: boolean;
  title: string;
  body: string;
  siteUrl: string;
}

export const EMPTY_ORDER: OrderData = {
  isCasino: false,
  method: null,
  email: "",
  contactPhone: "",
  companyName: "",
  companyCui: "",
  companyAddress: "",
  hasArticle: true,
  title: "",
  body: "",
  siteUrl: "",
};

export type StepKind =
  | "choice"
  | "text"
  | "email"
  | "tel"
  | "long"
  | "images"
  | "proof"
  | "review";

export interface Step {
  id: string;
  /** Ce spune consultantul cand se ajunge la pasul asta. */
  ask: (d: OrderData) => string;
  kind: StepKind;
  placeholder?: string;
  choices?: { label: string; value: string }[];
  /** Intoarce mesajul de eroare, sau null daca valoarea e buna. */
  validate?: (value: string, d: OrderData) => string | null;
  /** Pasii care nu se aplica la comanda curenta (ex. titlul, daca scriem noi). */
  skip?: (d: OrderData) => boolean;
  /** Pasul poate fi sarit de client cu un buton „Nu am / Sar peste". */
  skippable?: boolean;
}

export const PRICE_STANDARD = 500;
export const PRICE_CASINO = 1000;

export function priceOf(d: OrderData): number {
  return d.isCasino ? PRICE_CASINO : PRICE_STANDARD;
}

export function packageIdOf(d: OrderData): string {
  return d.isCasino ? "promo-50-cazino" : "promo-50";
}

const RO_PHONE = /^(\+?4?0)[\s.-]?7\d{2}[\s.-]?\d{3}[\s.-]?\d{3}$/;

// Minimul impus de /api/comanda/transfer pe corpul articolului. Il verificam si
// aici, ca omul sa afle inainte sa trimita, nu dupa ce serverul refuza.
export const MIN_BODY = 100;
// La tema (cand redactam noi) cerem mai putin — dar destul cat sa putem scrie.
export const MIN_THEME = 40;

export const STEPS: Step[] = [
  {
    id: "casino",
    kind: "choice",
    ask: () =>
      "Perfect, hai să facem comanda aici. Întâi o întrebare care schimbă prețul: articolul e despre cazinouri, pariuri sau jocuri de noroc?",
    choices: [
      { label: "Nu, e alt domeniu", value: "nu" },
      { label: "Da, cazino / pariuri", value: "da" },
    ],
  },
  {
    id: "method",
    kind: "choice",
    ask: (d) =>
      `Publicarea în toate cele 50 de ziare costă ${priceOf(d)} lei, cu factură fiscală. Cum vrei să plătești?`,
    choices: [
      { label: "Cu cardul, acum", value: "card" },
      { label: "Prin transfer bancar (OP)", value: "op" },
    ],
  },
  {
    id: "email",
    kind: "email",
    ask: () =>
      "Pe ce adresă de email trimitem factura și raportul cu linkurile?",
    placeholder: "email@firma.ro",
    validate: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Adresa nu pare validă. Mai încearcă o dată.",
  },
  {
    id: "contactPhone",
    kind: "tel",
    skip: (d) => d.method !== "op",
    ask: () => "Un număr de telefon, în caz că trebuie să te sunăm despre comandă.",
    placeholder: "07xx xxx xxx",
    validate: (v) =>
      RO_PHONE.test(v.trim()) ? null : "Scrie un număr de telefon românesc valid (ex. 0758 169 388).",
  },
  {
    id: "companyName",
    kind: "text",
    skip: (d) => d.method !== "op",
    ask: () => "Acum datele de facturare. Denumirea firmei, exact ca la Registrul Comerțului:",
    placeholder: "Exemplu S.R.L.",
    validate: (v) => (v.trim().length >= 2 ? null : "Scrie denumirea firmei."),
  },
  {
    id: "companyCui",
    kind: "text",
    skip: (d) => d.method !== "op",
    ask: () => "CUI-ul firmei:",
    placeholder: "RO12345678",
    validate: (v) =>
      /\d{2,10}/.test(v.trim()) ? null : "CUI-ul trebuie să conțină cifre (ex. RO12345678).",
  },
  {
    id: "companyAddress",
    kind: "text",
    skip: (d) => d.method !== "op",
    ask: () => "Adresa firmei (stradă, număr, oraș, județ):",
    placeholder: "Str. Exemplu nr. 1, București",
    validate: (v) => (v.trim().length >= 5 ? null : "Scrie adresa completă."),
  },
  {
    id: "hasArticle",
    kind: "choice",
    skip: (d) => d.method !== "op",
    ask: () => "Ai articolul scris, sau îl redactăm noi? (îl scriem noi fără cost suplimentar)",
    choices: [
      { label: "Am articolul scris", value: "am" },
      { label: "Scrieți-l voi", value: "nu-am" },
    ],
  },
  {
    id: "title",
    kind: "text",
    skip: (d) => d.method !== "op" || !d.hasArticle,
    ask: () => "Titlul articolului:",
    placeholder: "Titlul care apare în ziare",
    validate: (v) => (v.trim().length >= 5 ? null : "Titlul e prea scurt."),
  },
  {
    id: "body",
    kind: "long",
    skip: (d) => d.method !== "op" || !d.hasArticle,
    ask: () =>
      `Lipește textul articolului. Ideal 300–500 de cuvinte, dar acceptăm de la ${MIN_BODY} de caractere.`,
    placeholder: "Textul articolului...",
    validate: (v) =>
      v.trim().length >= MIN_BODY
        ? null
        : `Mai scurt de ${MIN_BODY} de caractere. Acum are ${v.trim().length}.`,
  },
  {
    id: "theme",
    kind: "long",
    skip: (d) => d.method !== "op" || d.hasArticle,
    ask: () =>
      "Spune-mi despre ce să scriem: ce face firma, ce vrei să comunici, ce e important să apară. Câteva propoziții sunt de ajuns.",
    placeholder: "Ce face firma, ce vrei să comunici...",
    validate: (v) =>
      v.trim().length >= MIN_THEME
        ? null
        : `Mai scrie câteva cuvinte — am nevoie de minimum ${MIN_THEME} de caractere ca să pot redacta.`,
  },
  {
    id: "siteUrl",
    kind: "text",
    skip: (d) => d.method !== "op",
    skippable: true,
    ask: () => "Site-ul către care punem linkurile:",
    placeholder: "https://site-ul-tau.ro",
    validate: (v) =>
      !v.trim() || /^https?:\/\/\S+\.\S+/.test(v.trim())
        ? null
        : "Scrie adresa completă, cu https:// la început.",
  },
  {
    id: "images",
    kind: "images",
    skip: (d) => d.method !== "op",
    skippable: true,
    ask: () => "Ai poze pentru articol? Poți încărca până la 3. Dacă nu ai, publicăm fără.",
  },
  {
    id: "proof",
    kind: "proof",
    skip: (d) => d.method !== "op",
    ask: (d) => bankDetailsText(priceOf(d)),
  },
  {
    id: "review",
    kind: "review",
    skip: (d) => d.method !== "op",
    ask: () => "Gata. Verifică datele și trimite comanda:",
  },
];

export function bankDetailsText(amount: number): string {
  return [
    "Acum plata. Datele pentru transfer:",
    "",
    `Beneficiar: ${SITE.billing.company}`,
    `IBAN: ${SITE.billing.iban}`,
    `Banca: ${SITE.billing.bank}`,
    `Suma: ${amount} lei`,
    "Detalii plată: Publicare articol — 50 de ziare",
    "",
    "După ce faci transferul, încarcă aici dovada (captură din aplicația băncii sau ordinul de plată în PDF).",
  ].join("\n");
}

/** Pasul urmator care chiar se aplica la comanda asta. */
export function nextStepIndex(from: number, d: OrderData): number {
  for (let i = from; i < STEPS.length; i++) {
    if (!STEPS[i].skip?.(d)) return i;
  }
  return STEPS.length;
}

/**
 * Cand redactam noi articolul, corpul trimis spre admin trebuie sa spuna clar
 * ca e o tema, nu textul final — altfel ajunge publicat ca atare. Marcajul e
 * pe primul rand, ca sa se vada in lista de comenzi fara sa o deschizi.
 */
export function buildSubmission(d: OrderData) {
  const body = d.hasArticle
    ? d.body.trim()
    : `[DE REDACTAT DE NOI — clientul nu are articol scris]\n\nTema primită de la client:\n${d.body.trim()}`;

  return {
    packageId: packageIdOf(d),
    isCasino: d.isCasino,
    email: d.email.trim(),
    contactPhone: d.contactPhone.trim(),
    companyName: d.companyName.trim(),
    companyCui: d.companyCui.trim(),
    companyAddress: d.companyAddress.trim(),
    title: d.hasArticle ? d.title.trim() : `[De redactat] ${d.companyName.trim()}`,
    body,
    siteUrl: d.siteUrl.trim() || undefined,
  };
}
