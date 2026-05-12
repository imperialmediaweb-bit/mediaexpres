// OpenAI Chat Completions wrapper via fetch (no SDK).
// All functions use response_format: json_object to enforce structured output.
// Docs: https://platform.openai.com/docs/api-reference/chat/create

export interface GenerateArticleInput {
  topic: string;
  keyPoints?: string;
  audience?: string;
  tone?: "neutru" | "promotional" | "informativ";
  category?: "standard" | "casino";
}

export interface GenerateArticleOutput {
  title: string;
  body: string;
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// Long-form (articole, press release, calendar editorial) — calitate prima.
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
// Short-form (outreach emails, title variants) — volume mare, cost conteaza.
const MODEL_FAST = process.env.OPENAI_MODEL_FAST || "gpt-4o-mini";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CallOpenAIArgs {
  system: string;
  user: string;
  model?: string;
  maxTokens: number;
  contextTag: string;
}

async function callOpenAI(args: CallOpenAIArgs): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY lipseste");

  const messages: OpenAIMessage[] = [
    { role: "system", content: args.system },
    { role: "user", content: args.user },
  ];

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: args.model || MODEL,
      messages,
      max_tokens: args.maxTokens,
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error(`[ai] OpenAI ${args.contextTag} error`, res.status, txt);
    throw new Error(`Generarea a esuat (${res.status})`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    console.error(`[ai] OpenAI ${args.contextTag} empty content`, data);
    throw new Error("Raspuns gol de la model");
  }
  return content;
}

function parseJson<T>(raw: string, contextTag: string): T {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const candidate = jsonMatch ? jsonMatch[0] : raw;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    console.error(`[ai] could not parse JSON for ${contextTag}`, raw);
    throw new Error("Raspunsul modelului nu a putut fi parsat");
  }
}

export interface PressReleaseInput {
  companyName: string;
  announcement: string;
  type:
    | "lansare"
    | "eveniment"
    | "parteneriat"
    | "rezultate"
    | "extindere"
    | "premii"
    | "altceva";
  contactName?: string;
  contactEmail?: string;
  city?: string;
}

export async function generatePressRelease(
  input: PressReleaseInput
): Promise<GenerateArticleOutput> {
  const typeLabel: Record<PressReleaseInput["type"], string> = {
    lansare: "lansare de produs/serviciu",
    eveniment: "anunt de eveniment",
    parteneriat: "parteneriat strategic",
    rezultate: "rezultate financiare/operationale",
    extindere: "extindere/locatie noua",
    premii: "premiu sau distinctie",
    altceva: "anunt corporate",
  };

  const system = `Esti un redactor de PR profesionist din Romania. Scrii comunicate de presa intr-un format jurnalistic standard, respectand:
- structura: TITLU + INTRO (cine/ce/cand/unde) + 3-4 PARAGRAFE de context + CITAT din partea reprezentantului firmei + BOILERPLATE despre companie
- ton informativ, neutru, fara superlative nefondate
- 300-500 cuvinte
- in limba romana corecta cu diacritice
- fara clickbait, fara afirmatii imposibil de verificat

Raspunde STRICT in format JSON cu cheile "title" si "body", fara markdown, fara comentarii. "body" contine textul cu paragrafe separate prin \\n\\n.`;

  const cityClause = input.city ? ` din ${input.city}` : "";
  const contactClause =
    input.contactName && input.contactEmail
      ? `\nPersoana de contact pentru presa: ${input.contactName}, ${input.contactEmail}`
      : "";

  const userPrompt = `Tip comunicat: ${typeLabel[input.type]}
Companie: ${input.companyName}${cityClause}
Ce anunta: ${input.announcement}${contactClause}

Scrie comunicatul de presa.`;

  const text = await callOpenAI({
    system,
    user: userPrompt,
    maxTokens: 1500,
    contextTag: "press-release",
  });

  const parsed = parseJson<{ title?: string; body?: string }>(text, "press-release");
  if (!parsed.title || !parsed.body) throw new Error("Raspuns incomplet");
  return { title: parsed.title, body: parsed.body };
}

export interface TitleVariant {
  title: string;
  ctrScore: number;
  reasoning: string;
}

export async function generateTitleVariants(
  topic: string
): Promise<TitleVariant[]> {
  const system = `Esti un expert in copywriting jurnalistic pentru piata din Romania. Generezi 5 variante de titlu pentru un articol/comunicat de presa dat. Pentru fiecare titlu evaluezi probabil-CTR pe o scara 1-100, bazat pe:
- claritatea promisiunii (cititorul intelege beneficiul instant)
- specificitate (cifre, nume, locuri concrete bat generic-ul)
- emotie/curiozitate fara clickbait
- lungime optima 50-70 caractere
- adaptat publicului romanesc, fara jargonisme

Raspunde STRICT in format JSON cu cheia "variants": un array de exact 5 obiecte, fiecare cu cheile "title" (string), "ctrScore" (numar intreg 1-100), "reasoning" (string scurt — max 80 caractere — explicand de ce e bun sau slab). Fara markdown, fara comentarii.`;

  const userPrompt = `Tema: ${topic}\n\nGenereaza 5 variante de titlu cu evaluare CTR.`;

  const text = await callOpenAI({
    system,
    user: userPrompt,
    model: MODEL_FAST,
    maxTokens: 800,
    contextTag: "title-variants",
  });

  const parsed = parseJson<{ variants?: unknown }>(text, "title-variants");
  const variants = parsed.variants;
  if (!Array.isArray(variants)) throw new Error("Format invalid");
  return variants
    .map((v) => v as TitleVariant)
    .filter(
      (v) =>
        typeof v?.title === "string" &&
        typeof v?.ctrScore === "number" &&
        typeof v?.reasoning === "string"
    )
    .slice(0, 5);
}

export async function generateArticle(
  input: GenerateArticleInput
): Promise<GenerateArticleOutput> {
  const isCasino = input.category === "casino";
  const system = `Esti un redactor profesionist pentru MediaExpres, o retea de ziare online din Romania. Scrii articole advertoriale care respecta urmatoarele reguli:
- limba romana, clara, fara diacritice lipsa
- ton ${input.tone || "informativ"}, neutru redactional
- structura: titlu + 4-6 paragrafe + un call-to-action subtil la final
- 450-700 cuvinte
- fara afirmatii nefundamentate
- fara limbaj senzational sau click-bait
${isCasino ? "- tema: iGaming / cazino / pariuri — respecta reglementarile ONJN si mentioneaza joc responsabil" : ""}

Raspunde STRICT in format JSON cu cheile "title" si "body", fara markdown, fara comentarii. "body" este textul cu paragrafe separate prin \\n\\n.`;

  const userPrompt = `Tema: ${input.topic}
${input.keyPoints ? `Puncte cheie: ${input.keyPoints}\n` : ""}${input.audience ? `Publicul tinta: ${input.audience}\n` : ""}
Scrie articolul.`;

  const text = await callOpenAI({
    system,
    user: userPrompt,
    maxTokens: 2000,
    contextTag: "article",
  });

  const parsed = parseJson<{ title?: string; body?: string }>(text, "article");
  if (!parsed.title || !parsed.body) throw new Error("Raspuns incomplet");
  return { title: parsed.title, body: parsed.body };
}

export interface EditorialMonth {
  month: number;
  monthName: string;
  theme: string;
  hook: string;
  suggestedFormat:
    | "lansare"
    | "eveniment"
    | "rezultate"
    | "extindere"
    | "altceva";
}

export async function generateEditorialCalendar(
  industry: string,
  companyContext: string
): Promise<EditorialMonth[]> {
  const system = `Esti un strateg de PR cu experienta pe piata din Romania. Construiesti un calendar editorial anual (12 luni) cu teme de comunicate de presa. Pentru fiecare luna:
- iei in calcul sezonalitatea industriei date
- alegi teme care produc real interes mediatic in luna respectiva (ex: bilanturi anuale in ianuarie, vacante de vara in iulie, raport anual in martie, sezonul cumparaturilor in noiembrie)
- variaza tipurile (lansari, evenimente, rezultate, parteneriate, extinderi, premii)
- formuleaza temele specific, nu generic ("Bilantul vanzarilor 2025 cu cifre de crestere" vs "Anul 2025 a fost bun")

Raspunde STRICT in format JSON cu cheia "calendar": un array de exact 12 obiecte, fiecare cu cheile:
- "month" (1-12)
- "monthName" (Ianuarie, Februarie, ...)
- "theme" (string scurt, max 80 caractere)
- "hook" (1-2 propozitii care explica de ce e potrivita in luna respectiva)
- "suggestedFormat" (unul din: lansare, eveniment, rezultate, extindere, altceva)

Fara markdown, fara comentarii.`;

  const userPrompt = `Industria firmei: ${industry}
Context companie: ${companyContext}

Genereaza calendarul editorial pentru cele 12 luni.`;

  const text = await callOpenAI({
    system,
    user: userPrompt,
    maxTokens: 3000,
    contextTag: "editorial-calendar",
  });

  const parsed = parseJson<{ calendar?: unknown }>(text, "editorial-calendar");
  const arr = parsed.calendar;
  if (!Array.isArray(arr)) throw new Error("Format invalid");
  return arr
    .map((m) => m as EditorialMonth)
    .filter(
      (m) =>
        typeof m?.month === "number" &&
        typeof m?.theme === "string" &&
        typeof m?.hook === "string"
    )
    .slice(0, 12);
}

export interface OutreachEmailInput {
  companyName: string;
  industry?: string;
  city?: string;
  website?: string;
  notes?: string;
  ctaLink?: string;
}

export interface OutreachEmail {
  subject: string;
  body: string;
}

export async function generateOutreachEmail(
  input: OutreachEmailInput
): Promise<OutreachEmail> {
  const industryLower = (input.industry || "").toLowerCase();
  const isPRAgency =
    industryLower.includes("agentie pr") ||
    industryLower.includes("agenție pr") ||
    industryLower.includes("pr agency") ||
    industryLower.includes("comunicare") ||
    industryLower.includes("relatii publice") ||
    industryLower.includes("relații publice");
  const isCasino =
    industryLower.includes("cazino") ||
    industryLower.includes("casino") ||
    industryLower.includes("igaming") ||
    industryLower.includes("pariuri") ||
    industryLower.includes("betting");

  const SOCIAL_PROOF =
    "Colaboram deja cu June, Emblema Grup, WhitePress (jucator European top), Blogatu si magazine online de renume din Romania.";

  const PACKAGES_CONTEXT = `Oferta MediaExpres (publicare comunicate de presa pe 50 de ziare romanesti + 50 pagini Facebook, raport in 12h, raport PDF):
- Pachet Local: 150 RON - 1 ziar judetean (test rapid)
- Pachet Regional: 500 RON - 10 ziare dintr-o zona
- Pachet National 50: 1500 RON - 50 ziare (41 locale + 9 nationale) + 50 pagini Facebook + 50 backlinks SEO -- ACESTA ESTE PACHETUL RECOMANDAT DEFAULT, mentioneaza-l cu prioritate
- Pachet Cazino Local: 300 RON / Cazino Regional: 900 RON / Cazino National: 2500 RON (pentru iGaming, conform ONJN)

Abonamente lunare cu pret per articol mai mic:
- Bronze: 1.300 RON/luna - 1 articol x 50 ziare
- Silver: 2.400 RON/luna - 2 articole x 50 ziare
- Gold: 4.500 RON/luna - 4 articole x 50 ziare
- Platinum: 8.000 RON/luna - 8 articole x 50 ziare

VALOARE ADAUGATA cheie (mentioneaza intotdeauna): in contul clientului AI-ul nostru SCRIE articolul automat din 1-2 propozitii de tematica. Clientul nu trebuie sa scrie nimic - doar tematica + 3 poze. Plus, AI genereaza un calendar editorial cu 12 idei lunare specifice industriei lor.`;

  const ctaSection = input.ctaLink
    ? `LINK CTA UNIC (PRIORITATE MAXIMA - acesta este singurul CTA, nu cere "raspunde DA"):
${input.ctaLink}

Acest link duce la pagina personalizata cu oferta completa, lista 50 ziare si formular intake (date firma + articol/tematica + 3 poze). Mentioneaza ca dupa click totul e gestionat acolo, fara email back-and-forth.`
    : "";

  const PLACEHOLDER_RULE = `REGULA ABSOLUTA (PRIORITATE MAXIMA): NICIODATA nu folosi placeholders cu paranteze patrate sau acolade gen [oras], [domeniu], [text], [industrie], {x}, <variabila>, <city>, etc in raspuns. Daca o informatie despre firma LIPSESTE din contextul de mai jos (industrie, oras, note), TREBUIE sa OMITI complet propozitia care depinde de ea sau sa folosesti o abordare alternativa generica (gen "Bun gasit, scriu pentru un parteneriat scurt" sau "Am vazut site-ul vostru"). NU inventa orase, NU inventa industrii, NU folosi placeholders. Email-ul trebuie sa fie GATA DE TRIMITERE asa cum il scrii.`;

  const PR_AGENCY_SYSTEM = `Esti un BD manager B2B care construieste reseller-program intre MediaExpres si agentii PR din Romania. NU vinzi direct articole - propui un parteneriat in care agentia foloseste reteaua MediaExpres pentru clientii lor.

${PLACEHOLDER_RULE}

${PACKAGES_CONTEXT}

SOCIAL PROOF (foloseste subtil in pitch, nu fortat): ${SOCIAL_PROOF}

OFERTA SPECIALA RESELLER (mentioneaza in email):
- Discount 25-30% pe rate-card pentru toate pachetele si abonamentele
- White-label PDF report (raport cu sigla agentiei, nu MediaExpres)
- Factura lunara consolidata
- Cont de admin dedicat in platforma cu vizibilitate live pe statusul articolelor
- Prioritate la publicare (raport in 12h pentru clientii reseller)

Pozitionare cheie: "Nu suntem competitie - suntem distributorul vostru. Voi pastrati relatia cu clientul, noi facem heavy-lifting-ul pe distributie."

${ctaSection}

Reguli email:
- subject: scurt (max 65 caractere), mentioneaza concret reseller program SAU oferta specifica agentiei
- intro: 1 propozitie scurta personalizata. EXEMPLE CORECTE cand AI INFO: "Am vazut portofoliul vostru de clienti corporate" / "Am observat ca lucrati cu branduri din real estate". EXEMPLU CORECT cand NU AI INFO: "Bun gasit, scriu pentru un parteneriat reseller MediaExpres". NICIODATA placeholders.
- body: 2 paragrafe -
  PARAGRAFUL 1 explica problema concret: "Clientii vostri cer distributie larga (50+ ziare). Sa construiti voi reteaua = 6 luni si 50K+ EUR. Alternativa: revindeti reteaua noastra cu marja garantata."
  PARAGRAFUL 2 listeaza 3-4 castiguri pentru agentie:
    a) Discount 25-30% rate-card = marja garantata pe fiecare client
    b) White-label: raport cu sigla agentiei, clientul nu stie ca subcontractati
    c) Factura consolidata lunar = un singur invoice de gestionat
    d) Cont admin dedicat cu vizibilitate live + prioritate 12h la publicare
  + social proof scurt: "colaboram deja cu June, Emblema Grup, WhitePress si magazine online romanesti"
- CTA: STRICT INTERZIS sa propui apel, call, meeting, intalnire, sedinta, discutie video, factura proforma. Daca exista LINK CTA UNIC, pune-l cu text "Vezi termenii reseller + lista 50 ziare aici: [link real, NU placeholder]". Daca NU exista link, foloseste: "Raspunde-mi cu DA si iti trimit deck-ul cu termenii reseller pe email."
- semnatura: "Echipa MediaExpres - mediaexpress.ro"
- TON: peer-to-peer profesional, NU pushy, NU pitch generic.
- limba romana cu diacritice corecte

Raspunde STRICT in format JSON cu cheile "subject" si "body". "body" e text plain cu \\n\\n intre paragrafe. Fara markdown, fara comentarii.`;

  const STANDARD_SYSTEM = `Esti un copywriter B2B specializat in cold-email pentru piata din Romania. Scrii email-uri scurte (200-300 cuvinte) catre potentiali clienti directi, oferindu-le serviciul MediaExpres.

${PLACEHOLDER_RULE}

${PACKAGES_CONTEXT}

SOCIAL PROOF (foloseste subtil): ${SOCIAL_PROOF}

${isCasino ? "ATENTIE: prospectul activeaza in iGaming/cazino - mentioneaza pachetul Cazino, nu Standard. Pachetele Cazino sunt conform ONJN si include joc responsabil." : ""}

${ctaSection}

Reguli email:
- subject scurt si specific (max 60 caractere), personalizat pentru firma (foloseste numele firmei daca da ceva specific, ALTFEL ramai generic - NU pune [companie])
- intro: 1 propozitie scurta personalizata. EXEMPLE CORECTE cand AI INFO: "Am vazut ca aveti un cabinet stomatologic in Cluj-Napoca" / "Am dat peste magazinul vostru online cu cosmetice naturale". EXEMPLU CORECT cand NU AI INFO despre industrie/oras: "Bun gasit, scriu in legatura cu o oferta punctuala" / "Am vazut site-ul vostru si scriu pentru o oferta". NICIODATA [domeniu] [oras] [industrie] sau alte placeholders.
- body: 2 paragrafe -
  PARAGRAFUL 1 listeaza 3 BENEFICII CONCRETE CU CIFRE (alege 3 din lista in functie de industria firmei):
    a) Vizibilitate: articolul vostru apare pe 50 site-uri romanesti + 50 pagini Facebook (audience cumulat ~2M cititori/luna in reteaua noastra)
    b) SEO: 50 backlinks permanente din site-uri cu DR 25-60, Google indexare in 24-48h
    c) Credibilitate: aparitie redactionala (jurnalistic, nu reclama platita) - articolul apare ca stire, nu ca anunt
    d) Lead-uri: clientii nostri raporteaza in medie +15-30% trafic organic in luna urmatoare publicarii
    e) Permanent: articolul ramane online la nesfarsit, lucreaza pentru voi luni de zile dupa publicare
  + social proof scurt: "colaboram cu June, Emblema Grup, WhitePress si magazine online de renume din RO"
  PARAGRAFUL 2 recomanda pachetul potrivit:
    - DEFAULT (firme normale): Pachet National 50 (1500 RON) - 41 ziare locale + 9 nationale + 50 pagini Facebook + 50 backlinks SEO
    - DACA E iGaming/cazino: Pachet Cazino National (2500 RON), conform ONJN
  + mentioneaza ca AI scrie articolul din 1-2 propozitii de tematica (clientul nu trebuie sa scrie nimic, doar 3 poze + tematica)
- CTA: STRICT INTERZIS apel, call, meeting, intalnire, sedinta, discutie video, factura proforma. Daca exista LINK CTA UNIC, pune-l cu text "Vezi oferta completa, lista 50 ziare si completeaza datele (firma + tematica + 3 poze): [link real]". Daca NU exista link, foloseste: "Raspunde-mi cu DA si iti trimit detaliile complete."
- semnatura: "Echipa MediaExpres - mediaexpress.ro"
- TON profesional, NU pushy, NU clickbait
- limba romana cu diacritice

Raspunde STRICT in format JSON cu cheile "subject" si "body". "body" e text plain cu \\n\\n intre paragrafe. Fara markdown, fara comentarii.`;

  const system = isPRAgency ? PR_AGENCY_SYSTEM : STANDARD_SYSTEM;

  const ctx = [
    `Companie: ${input.companyName}`,
    input.industry ? `Industrie: ${input.industry}` : "INDUSTRIE NECUNOSCUTA - omite referintele la industrie",
    input.city ? `Oras: ${input.city}` : "ORAS NECUNOSCUT - omite referintele la oras",
    input.website ? `Site web: ${input.website}` : "",
    input.notes ? `Note: ${input.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `${ctx}\n\nGenereaza un email de outreach pentru aceasta firma. AMINTESTE-TI: NICIODATA placeholders [x] - daca info lipseste, omite acea parte sau foloseste fallback generic.`;

  const text = await callOpenAI({
    system,
    user: userPrompt,
    model: MODEL_FAST,
    maxTokens: 1000,
    contextTag: "outreach-email",
  });

  const parsed = parseJson<{ subject?: string; body?: string }>(text, "outreach-email");
  if (!parsed.subject || !parsed.body) throw new Error("Raspuns incomplet");

  // Safety net: daca modelul tot a strecurat [x] sau {y} in output, le scoatem
  // si curatam dublu-spatiile rezultate. Mai bine email scurt decat email cu
  // [domeniu] vizibil la prospect.
  const cleanPlaceholders = (s: string) =>
    s
      .replace(/\[[^\]\n]{1,40}\]/g, "")
      .replace(/\{[^}\n]{1,40}\}/g, "")
      .replace(/<(?!\/?(a|br|p|strong|b|em|i)\b)[^>\n]{1,40}>/gi, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/ \./g, ".")
      .replace(/ ,/g, ",")
      .trim();

  return {
    subject: cleanPlaceholders(parsed.subject),
    body: cleanPlaceholders(parsed.body),
  };
}
