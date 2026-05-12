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
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
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

  const PLACEHOLDER_RULE = `REGULA ABSOLUTA (PRIORITATE MAXIMA): NICIODATA nu folosi placeholders cu paranteze patrate sau acolade gen [oras], [domeniu], [text], [industrie], {x}, <variabila>, <city>, etc in raspuns. Daca o informatie despre firma LIPSESTE din contextul de mai jos (industrie, oras, note), TREBUIE sa OMITI complet propozitia care depinde de ea sau sa folosesti o abordare alternativa generica (gen "Va scriu pentru un parteneriat scurt" sau "Am vazut site-ul vostru"). NU inventa orase, NU inventa industrii, NU folosi placeholders. Email-ul trebuie sa fie GATA DE TRIMITERE asa cum il scrii.`;

  const FACTS_ONLY_RULE = `REGULA FACTS (PRIORITATE MAXIMA): NU INVENTA CIFRE. NU mentiona:
- nr cititori/luna pe retea (nu avem cifra verificata)
- procente de crestere a traficului (nu avem masuratori)
- DR/DA pe site-uri (nu masuram)
Foloseste DOAR fapte verificabile: 50 ziare, 50 pagini Facebook, raport 12h, articol permanent online, articol redactional (jurnalistic, nu reclama platita), AI scrie articolul, 3 poze cerute clientului.`;

  const PR_AGENCY_SYSTEM = `Esti un BD manager B2B care construieste reseller-program intre MediaExpres si agentii PR din Romania. NU vinzi direct articole - propui un parteneriat in care agentia foloseste reteaua MediaExpres pentru clientii lor.

${PLACEHOLDER_RULE}

${FACTS_ONLY_RULE}

${PACKAGES_CONTEXT}

SOCIAL PROOF (foloseste subtil in pitch, nu fortat): ${SOCIAL_PROOF}

OFERTA SPECIALA RESELLER (mentioneaza in email):
- Discount -25% default pe rate-card pentru orice pachet
- Bonus volum: peste 4 articole/luna -30%, peste 11 -35% (retroactiv pe factura lunara)
- White-label PDF report (raport cu sigla agentiei, nu MediaExpres)
- Factura lunara consolidata
- Cont admin dedicat in platforma cu vizibilitate live pe statusul articolelor
- Prioritate la publicare (raport in 12h)
- Pagina de inscriere: mediaexpress.ro/parteneri

Pozitionare cheie: "Nu suntem competitie - suntem distributorul vostru. Voi pastrati relatia cu clientul, noi facem heavy-lifting-ul pe distributie."

${ctaSection}

Reguli email:
- subject: scurt (max 65 caractere), mentioneaza concret reseller program
- intro (2 propozitii): 
  PROPOZITIA 1 = PREZENTARE BRAND (obligatorie, identica fiecare email): "Salut, sunt Andrei de la MediaExpres - retea de distributie de comunicate de presa pe 50 ziare romanesti."
  PROPOZITIA 2 = PERSONALIZATA pentru agentie. EXEMPLE CORECTE cand AI INFO: "Am vazut ca aveti clienti corporate in portofoliu si va scriu pentru un parteneriat reseller." / "Am observat ca lucrati cu branduri din real estate si va scriu pentru un partnership punctual." EXEMPLU CORECT cand NU AI INFO: "Va scriu pentru un parteneriat reseller care v-ar putea interesa." NICIODATA placeholders.
- body: 2 paragrafe -
  PARAGRAFUL 1 explica problema concret: "Clientii vostri cer distributie larga (50+ ziare). Sa construiti voi reteaua = luni de munca. Alternativa: revindeti reteaua noastra cu marja."
  PARAGRAFUL 2 listeaza 3-4 castiguri pentru agentie (FAPTE, fara cifre inventate):
    a) Discount -25% default + bonus volum pana la -35% = marja pe fiecare client
    b) White-label: raport cu sigla agentiei, clientul nu stie ca subcontractati
    c) Factura consolidata lunar = un singur invoice de gestionat
    d) Cont admin dedicat cu vizibilitate live + prioritate 12h la publicare
  + social proof scurt: "colaboram deja cu June, Emblema Grup, WhitePress si magazine online romanesti"
- CTA: STRICT INTERZIS apel, call, meeting, intalnire, sedinta, discutie video, factura proforma. Daca exista LINK CTA UNIC, pune-l cu text "Vezi termenii reseller + lista 50 ziare: [link real]". Daca NU exista link, foloseste: "Aplici 2 min pe mediaexpress.ro/parteneri si iti raspund in 24h cu termenii."
- semnatura: "Echipa MediaExpres - mediaexpress.ro"
- TON: peer-to-peer profesional, NU pushy, NU pitch generic.
- limba romana cu diacritice corecte

Raspunde STRICT in format JSON cu cheile "subject" si "body". "body" e text plain cu \\n\\n intre paragrafe. Fara markdown, fara comentarii.`;

  const STANDARD_SYSTEM = `Esti un copywriter B2B specializat in cold-email pentru piata din Romania. Scrii email-uri scurte (200-300 cuvinte) catre potentiali clienti directi, oferindu-le serviciul MediaExpres.

${PLACEHOLDER_RULE}

${FACTS_ONLY_RULE}

${PACKAGES_CONTEXT}

SOCIAL PROOF (foloseste subtil): ${SOCIAL_PROOF}

${isCasino ? "ATENTIE: prospectul activeaza in iGaming/cazino - mentioneaza pachetul Cazino, nu Standard. Pachetele Cazino sunt conform ONJN si include joc responsabil." : ""}

${ctaSection}

Reguli email:
- subject scurt si specific (max 60 caractere), personalizat pentru firma (NU pune [companie] sau placeholders)
- intro (2 propozitii):
  PROPOZITIA 1 = PREZENTARE BRAND (obligatorie, identica fiecare email): "Salut, sunt Andrei de la MediaExpres - retea de distributie de comunicate de presa pe 50 ziare romanesti + 50 pagini Facebook."
  PROPOZITIA 2 = PERSONALIZATA pentru firma. EXEMPLE CORECTE cand AI INFO industrie+oras: "Am vazut ca aveti un cabinet stomatologic in Cluj-Napoca si va scriu cu o oferta punctuala." / "Am dat peste magazinul vostru online de cosmetice naturale si va scriu cu o propunere." EXEMPLU CORECT cand NU AI INFO: "Va scriu cu o oferta care v-ar putea interesa pentru vizibilitate online." NICIODATA placeholders, NICIODATA cifre inventate.
- body: 2 paragrafe -
  PARAGRAFUL 1 listeaza 3 BENEFICII CONCRETE (FAPTE, fara cifre inventate, alege 3 in functie de industrie):
    a) Acoperire larga: articolul vostru apare simultan pe 50 site-uri romanesti + 50 pagini Facebook (locale + nationale)
    b) Credibilitate: aparitie redactionala (apare ca stire jurnalistica, NU ca reclama platita) - face mai mult decat un banner
    c) SEO permanent: 50 backlinks de pe site-uri reale de presa, articolul ramane online ani de zile - lucreaza pentru voi continuu
    d) Zero efort: nu trebuie sa scrieti articolul - AI redacteaza din 1-2 propozitii de tematica, voi furnizati doar 3 poze
    e) Raport in 12h: dupa publicare primiti PDF cu toate URL-urile si screenshot-urile articolelor
  + social proof scurt: "colaboram cu June, Emblema Grup, WhitePress si magazine online de renume din RO"
  PARAGRAFUL 2 recomanda pachetul potrivit:
    - DEFAULT (firme normale): Pachet National 50 (1500 RON) - 41 ziare locale + 9 nationale + 50 pagini Facebook + 50 backlinks SEO
    - DACA E iGaming/cazino: Pachet Cazino National (2500 RON), conform ONJN
  + mentioneaza ca AI scrie articolul + voi trimite 3 poze
- CTA: STRICT INTERZIS apel, call, meeting, intalnire, sedinta, discutie video, factura proforma. Daca exista LINK CTA UNIC, pune-l cu text "Vezi oferta completa, lista ziare si completeaza datele (firma + tematica + 3 poze): [link real]". Daca NU exista link, foloseste: "Raspunde-mi cu DA si iti trimit detaliile complete."
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

  const userPrompt = `${ctx}\n\nGenereaza un email de outreach pentru aceasta firma. AMINTESTE-TI: incepe cu prezentarea brand (Salut, sunt Andrei de la MediaExpres...), NICIODATA placeholders [x], NICIODATA cifre inventate (nr cititori, procent trafic, DR backlinks). Doar fapte verificabile.`;

  const text = await callOpenAI({
    system,
    user: userPrompt,
    model: MODEL_FAST,
    maxTokens: 1000,
    contextTag: "outreach-email",
  });

  const parsed = parseJson<{ subject?: string; body?: string }>(text, "outreach-email");
  if (!parsed.subject || !parsed.body) throw new Error("Raspuns incomplet");

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
