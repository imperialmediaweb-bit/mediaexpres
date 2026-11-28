import { SITE } from "@/data/site";
import { CONTENT_DECLARATION_SHORT, TITLU_DE_PROPUS } from "@/lib/content-policy";
import { RITMURI, RITM_IMPLICIT, type RitmId } from "@/lib/ritm";

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
  /** Ziarul din lista pe care promovam postarea 3 zile; gol = alegem noi. */
  fbBoostPaper: string;
  method: "card" | "op" | null;
  email: string;
  contactPhone: string;
  companyName: string;
  companyCui: string;
  companyAddress: string;
  hasArticle: boolean;
  /** 28.11.2026 — articolul vine ca fisier Word (.docx), citit in browser. */
  articolWord: boolean;
  /** 28.11.2026 — articolul si pozele vin dupa plata (ca in formular). */
  articolDupa: boolean;
  title: string;
  body: string;
  siteUrl: string;
  /** „pe ce cuvinte → spre ce adresa", o linie pe link. */
  linkNotes: string;
  /** Text rescris unic pe fiecare ziar (recomandat) sau identic. */
  uniquePerSite: boolean;
  linkuriSponsored: boolean;
  ritm: RitmId;
  /** Declaratia de continut, ceruta inainte de plata. */
  contentDeclaration: boolean;
}

export const EMPTY_ORDER: OrderData = {
  isCasino: false,
  fbBoostPaper: "",
  method: null,
  email: "",
  contactPhone: "",
  companyName: "",
  companyCui: "",
  companyAddress: "",
  hasArticle: true,
  articolWord: false,
  articolDupa: false,
  title: "",
  body: "",
  siteUrl: "",
  linkNotes: "",
  uniquePerSite: true,
  linkuriSponsored: false,
  ritm: RITM_IMPLICIT,
  contentDeclaration: false,
};

export type StepKind =
  | "choice"
  | "text"
  | "email"
  | "tel"
  | "long"
  | "images"
  | "docx"
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
      `Publicarea în toate cele 50 de ziare costă ${priceOf(d)} lei, cu factură fiscală. Recomand cardul: plătești acum în siguranță (Stripe), factura vine automat pe email și pornim imediat. Prin OP primești o proformă și pornim când intră banii. Cum vrei să plătești?`,
    choices: [
      { label: "Cu cardul, acum (recomandat)", value: "card" },
      { label: "Prin transfer bancar (OP), cu proformă", value: "op" },
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
      RO_PHONE.test(v.trim()) ? null : "Scrie un număr de telefon românesc valid (ex. 0741 970 247).",
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
    ask: () =>
      "Cum vine articolul?\n\n• Îl lipești ca text, aici în chat.\n• Îl urci în Word (.docx): luăm singuri titlul, textul, linkurile și pozele din el.\n• Îl scriem noi, fără cost: ne spui ce face firma și ce vrei să transmiți.\n• Îl trimiți după plată: plătești acum și ne trimiți textul și pozele când le ai.",
    choices: [
      { label: "Îl lipesc ca text", value: "am" },
      { label: "Îl urc în Word (.docx)", value: "word" },
      { label: "Scrieți-l voi", value: "nu-am" },
      { label: "Îl trimit după plată", value: "dupa" },
    ],
  },
  {
    id: "docx",
    kind: "docx",
    skip: (d) => d.method !== "op" || !d.articolWord,
    ask: () => "Urcă fișierul Word (.docx). Luăm din el titlul, textul, linkurile și pozele.",
  },
  {
    id: "title",
    kind: "text",
    skip: (d) => d.method !== "op" || !d.hasArticle || d.articolDupa || d.articolWord,
    ask: () => "Titlul articolului:",
    placeholder: "Titlul care apare în ziare",
    validate: (v) => (v.trim().length >= 5 ? null : "Titlul e prea scurt."),
  },
  {
    id: "body",
    kind: "long",
    skip: (d) => d.method !== "op" || !d.hasArticle || d.articolDupa || d.articolWord,
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
    skip: (d) => d.method !== "op" || d.hasArticle || d.articolDupa,
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
    id: "linkNotes",
    kind: "long",
    skip: (d) => d.method !== "op" || d.articolDupa,
    skippable: true,
    ask: (d) =>
      d.linkNotes
        ? `Din Word am luat linkurile:\n${d.linkNotes}\nVrei să adaugi sau să schimbi ceva? Scrie aici, sau sari.`
        : "Pe ce cuvinte punem linkurile și spre ce adresă? Un rând pe link, de exemplu: „vopsitorie auto → https://firma.ro”. Sau sari, și le punem noi pe numele firmei.",
    placeholder: "cuvinte → https://adresa.ro",
  },
  {
    id: "images",
    kind: "images",
    skip: (d) => d.method !== "op" || d.articolDupa,
    skippable: true,
    ask: () => "Ai poze pentru articol? Poți încărca până la 3. Dacă nu ai, publicăm fără.",
  },
  {
    id: "uniquePerSite",
    kind: "choice",
    skip: (d) => d.method !== "op",
    ask: () =>
      "Textul îl vrei rescris sau identic?\n\n• Rescris (recomandat): fiecare ziar primește o variantă proprie, cu același mesaj, aceleași nume și aceleași linkuri. Google indexează mai bine textele unice, deci apari în mai multe locuri.\n• Identic: același text, cuvânt cu cuvânt, pe toate ziarele. Bun dacă textul e un comunicat oficial care nu se schimbă. Google poate arăta doar câteva dintre copii.",
    choices: [
      { label: "Rescris pe fiecare ziar (recomandat)", value: "unic" },
      { label: "Identic peste tot", value: "identic" },
    ],
  },
  {
    id: "linkuriSponsored",
    kind: "choice",
    skip: (d) => d.method !== "op",
    ask: () =>
      "Linkurile le lăsăm normale sau le marcăm „sponsored”?\n\n• Normale (dofollow, recomandat): linkul spre site-ul tău contează pentru Google, ca un link obișnuit dintr-un articol de presă.\n• Sponsored: îi spune lui Google că linkul e plătit. Cititorii nu văd nicio diferență, dar linkul nu mai contează pentru Google. Îl aleg firmele care vor să respecte strict regulile Google despre linkurile plătite.",
    choices: [
      { label: "Normale, dofollow", value: "nu" },
      { label: "Marcate sponsored", value: "da" },
    ],
  },
  {
    id: "ritm",
    kind: "choice",
    skip: (d) => d.method !== "op",
    ask: () =>
      "Cum publicăm?\n\n• Rapid: toate cele 50 de ziare în maximum 12 ore lucrătoare. Bun pentru o lansare, un eveniment sau o ofertă cu termen.\n• Întins pe 3 zile: câteva ziare pe zi. Arată mai natural și ține subiectul viu câteva zile.\n• Întins pe 2 săptămâni: puțin câte puțin. E cel mai natural pentru Google și apari mai mult timp în presă.",
    choices: RITMURI.map((r) => ({ label: r.eticheta, value: r.id })),
  },
  {
    // Promovarea pe Facebook (3 zile, reclama platita, inclusa): clientul
    // alege ziarul din lista, local sau national. Sare = alegem noi.
    id: "fbBoostPaper",
    kind: "text",
    skip: (d) => d.method !== "op",
    skippable: true,
    ask: () =>
      "Articolul primește și reclamă plătită pe Facebook, 3 zile, inclusă în preț: postarea cu articolul tău e promovată pe pagina unui ziar, la oamenii din zona aleasă. Pe ce ziar o vrei? Un ziar local (de ex. „Cluj Expres”) dacă clienții tăi sunt din județul acela, sau „România Expres” pentru toată țara. Scrie numele, sau sari și alegem noi ziarul din județul tău.",
    placeholder: "Numele ziarului, sau sari",
  },
  {
    id: "declaration",
    kind: "choice",
    skip: (d) => d.method !== "op",
    // Se pune INAINTE de datele de plata, nu dupa: intrebarea are rost doar
    // cat timp nu s-au miscat bani. Dupa incasare, un „nu" ar insemna
    // restituire — adica exact situatia pe care pasul asta o previne.
    ask: () => CONTENT_DECLARATION_SHORT,
    choices: [
      { label: "Da, confirm", value: "da" },
      { label: "Nu / nu sunt sigur", value: "nu" },
    ],
  },
  {
    id: "proof",
    kind: "proof",
    skip: (d) => d.method !== "op",
    // Sarit de cei mai multi, prin design: clientul comanda INTAI, primeste
    // factura pe email si plateste dupa. Pasul ramane pentru cine a platit
    // deja si vrea sa grabeasca verificarea.
    skippable: true,
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
  // 28.11.2026 — la OP pleaca intai proforma (lib/proforma.ts); factura
  // fiscala se emite dupa incasare.
  return [
    `Acum plata, ${amount} lei. Când trimiți comanda, îți fac pe loc proforma, cu IBAN-ul, aici în chat și pe email.`,
    "",
    `Beneficiar: ${SITE.billing.company}`,
    `IBAN: ${SITE.billing.iban}`,
    `Banca: ${SITE.billing.bank}`,
    "",
    "Plătești pe baza proformei, apoi urci dovada (aici sau pe pagina proformei). Factura fiscală vine pe email după încasare.",
    "Ai plătit deja? Încarcă dovada acum — altfel apasă butonul roșu.",
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
  const body = d.articolDupa
    ? ""
    : d.hasArticle
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
    title: d.articolDupa
      ? TITLU_DE_PROPUS
      : d.hasArticle
        ? d.title.trim() || TITLU_DE_PROPUS
        : `[De redactat] ${d.companyName.trim()}`,
    articolDupa: d.articolDupa,
    linkNotes: d.linkNotes.trim() || undefined,
    uniquePerSite: d.uniquePerSite,
    linkuriSponsored: d.linkuriSponsored,
    ritm: d.ritm,
    body,
    siteUrl: d.siteUrl.trim() || undefined,
    fbBoostPaper: d.fbBoostPaper.trim() || undefined,
    contentDeclaration: d.contentDeclaration,
  };
}
