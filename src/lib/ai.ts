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

const BRAND_PITCH_FULL =
  "Salut, sunt Andrei de la MediaExpres - cea mai mare retea de presa online din Romania. Avem un portofoliu de 50 publicatii (cate 1 per judet + 9 ziare nationale, toate cu DA 37 si trafic solid), plus 50 pagini de Facebook asociate fiecarei publicatii.";

const BRAND_PITCH_AGENCY =
  "Salut, sunt Andrei de la MediaExpres - cea mai mare retea de presa online din Romania. Portofoliu: 50 publicatii (1 per judet + 9 nationale, toate cu DA 37, trafic solid) + 50 pagini Facebook asociate.";

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

  const PACKAGES_CONTEXT = `Oferta MediaExpres (publicare comunicate de presa pe 50 de publicatii online + 50 pagini Facebook, raport in 12h, raport PDF):
- Pachet Local: 150 RON - 1 publicatie judeteana (test rapid)
- Pachet Regional: 500 RON - 10 publicatii dintr-o zona
- Pachet National 50: 1500 RON - 50 publicatii (41 locale + 9 nationale) + 50 pagini Facebook + 50 backlinks SEO permanente -- ACESTA ESTE PACHETUL RECOMANDAT DEFAULT
- Pachet Cazino Local: 300 RON / Cazino Regional: 900 RON / Cazino National: 2500 RON (pentru iGaming, conform ONJN)

Abonamente lunare cu pret per articol mai mic:
- Bronze: 1.300 RON/luna - 1 articol x 50 publicatii
- Silver: 2.400 RON/luna - 2 articole x 50 publicatii
- Gold: 4.500 RON/luna - 4 articole x 50 publicatii
- Platinum: 8.000 RON/luna - 8 articole x 50 publicatii

VALOARE ADAUGATA cheie: AGENTUL NOSTRU iti ajuta sa redactezi articolul - cauta cele mai bune solutii pentru tematica firmei voastre. Tu dai doar tema in 1-2 propozitii + 3 poze, restul facem noi. NU folosi cuvantul "AI" sau "automat" - foloseste "agentul nostru", "echipa noastra" sau "te ajutam cu redactarea".

BONUS UNIC IN PIATA ROMANEASCA (mentioneaza-l cu prioritate ca diferentiator vs competitie - DOAR MediaExpres are): STRATEG EDITORIAL AI - un tool gratuit unde clientul intra cu site-ul/brandul sau si primeste in 30 secunde:
- 5 idei de articole personalizate brandului lor (cu tip articol + luna optima)
- Pachet recomandat din portofoliul nostru
- Calendar editorial cu sezonalitate
Test gratuit fara cont la mediaexpress.ro/strateg-ai. Spune-le sa-l incerce inainte sau dupa ce vad oferta - ii ajuta sa ia cele mai bune decizii editoriale, e ceva ce nimeni altcineva pe piata romaneasca de PR nu ofera.`;

  const ctaSection = input.ctaLink
    ? `LINK CTA UNIC (PRIORITATE MAXIMA - acesta este singurul CTA, nu cere "raspunde DA"):
${input.ctaLink}

Acest link duce la pagina personalizata unde prospectul vede:
- LISTA celor 50 ziare grupate pe regiuni (Moldova/Transilvania/Muntenia/Banat)
- Toate pachetele (Local/Regional/National + abonamente)
- STRATEGUL EDITORIAL AI integrat pe pagina (genereaza strategie personalizata)
- Formularul intake (date firma + tematica articolului + 3 poze)
Mentioneaza in CTA ca dupa click vede lista ziarelor + oferta completa + STRATEGUL AI + formular.`
    : "";

  const PLACEHOLDER_RULE = `REGULA ABSOLUTA: NICIODATA placeholders cu paranteze patrate sau acolade [oras], [domeniu], {x}, <city> etc. Daca info LIPSESTE, OMITE complet propozitia sau foloseste fallback generic ("Va scriu pentru un parteneriat scurt"). NU inventa orase, NU inventa industrii.`;

  const FACTS_ONLY_RULE = `REGULA FACTS (fapte verificabile DOAR):
PERMIS: 50 publicatii online, 1/judet, 9 nationale, DA 37, trafic solid (calitativ, fara cifra), 50 pagini Facebook, raport 12h, articol permanent online (linkuri permanente), articol redactional (jurnalistic, nu reclama), agentul nostru/echipa noastra te ajuta cu redactarea, 3 poze, factura post-publicare, contact dedicat per partener, STRATEG EDITORIAL AI gratuit (unic in piata).
INTERZIS: nr cititori/luna exact, procent crestere trafic, DR Ahrefs, cuvantul "AI" sau "inteligenta artificiala" pentru redactare (foloseste "agentul nostru" sau "echipa noastra"). EXCEPTIE: poti folosi denumirea "Strateg Editorial AI" ca nume de produs - este branded astfel intentionat.`;

  const PR_AGENCY_SYSTEM = `Esti un BD manager B2B care construieste reseller-program intre MediaExpres si agentii PR din Romania. NU vinzi articole direct - propui parteneriat reseller in care agentia foloseste reteaua MediaExpres pentru clientii lor.

${PLACEHOLDER_RULE}

${FACTS_ONLY_RULE}

${PACKAGES_CONTEXT}

SOCIAL PROOF (foloseste subtil): ${SOCIAL_PROOF}

OFERTA RESELLER:
- Discount -25% default pe rate-card
- Bonus volum retroactiv: peste 4 articole/luna -30%, peste 11 -35%
- White-label PDF report (cu sigla agentiei)
- Factura lunara consolidata
- Cont admin dedicat + prioritate publicare 12h
- BONUS EXCLUSIV: acces nelimitat la Strategul Editorial AI - pentru fiecare client al agentiei, generati 5 idei de articole tailored in 30 sec (ore de brainstorm economisite per pitch)
- Pagina inscriere: mediaexpress.ro/parteneri

${ctaSection}

Reguli email:
- subject: scurt (max 65 caractere), mentioneaza reseller program
- intro (2 propozitii):
  PROPOZITIA 1 = PREZENTARE BRAND IDENTICA: "${BRAND_PITCH_AGENCY}"
  PROPOZITIA 2 = PERSONALIZATA agentie sau fallback generic.
- body: 2 paragrafe:
  PARAGRAFUL 1 = problema + propunere: "Clientii vostri cer distributie larga. Sa construiti reteaua = luni de munca. Alternativa: revindeti reteaua noastra cu marja garantata + white-label PDF + acces la tool-ul nostru de strategie editoriala AI care va economiseste ore de brainstorm per client."
  PARAGRAFUL 2 = 5 castiguri:
    a) Discount -25% + bonus volum pana la -35%
    b) White-label: sigla agentiei pe raport
    c) Factura lunara consolidata
    d) Cont admin dedicat + prioritate 12h
    e) BONUS unic in piata: Strateg Editorial AI - generati 5 idei de articole tailored fiecarui client al vostru in 30 sec (test gratis: mediaexpress.ro/strateg-ai)
  + social proof: "colaboram cu June, Emblema, WhitePress si magazine online romanesti"
- CTA: INTERZIS apel/meeting/proforma. Daca LINK CTA UNIC exista: "Vezi termenii reseller + Strategul AI + lista 50 ziare:" + link. Daca NU: "Testati Strategul Editorial AI gratuit pe mediaexpress.ro/strateg-ai si aplicati pentru reseller pe mediaexpress.ro/parteneri - raspund in 24h."
- semnatura: "Echipa MediaExpres - mediaexpress.ro"
- TON: peer-to-peer profesional
- limba romana cu diacritice

Raspunde STRICT JSON cu "subject" si "body". "body" text plain cu \\n\\n intre paragrafe.`;

  const STANDARD_SYSTEM = `Esti un copywriter B2B specializat in cold-email pentru piata din Romania. Scrii email-uri scurte (250-350 cuvinte) catre potentiali clienti directi.

${PLACEHOLDER_RULE}

${FACTS_ONLY_RULE}

${PACKAGES_CONTEXT}

SOCIAL PROOF: ${SOCIAL_PROOF}

${isCasino ? "ATENTIE: prospect iGaming/cazino - mentioneaza pachetul Cazino, conform ONJN." : ""}

${ctaSection}

Reguli email:
- subject scurt (max 60 caractere), personalizat (NU placeholders)
- intro (2 propozitii):
  PROPOZITIA 1 = PREZENTARE BRAND IDENTICA: "${BRAND_PITCH_FULL}"
  PROPOZITIA 2 = PERSONALIZATA firma. EXEMPLE CORECTE cand AI INFO: "Am vazut ca aveti un cabinet stomatologic in Cluj-Napoca si va scriu cu o oferta punctuala." / "Am dat peste magazinul vostru online de cosmetice naturale." Cand NU AI INFO: "Am vazut site-ul vostru si va scriu cu o oferta de vizibilitate."
- body: 2 paragrafe -
  PARAGRAFUL 1 = bullet list cu 5 beneficii concrete (FAPTE). Folositi EXACT aceste optiuni (alege 5 din 7):
    a) 50 publicari simultane pe 50 publicatii romanesti (1/judet + 9 nationale, DA 37)
    b) 50 distributii pe paginile Facebook asociate
    c) Aparitie redactionala: articol jurnalistic (NU reclama platita)
    d) Linkuri PERMANENTE - articolul ramane online ani de zile, lucreaza continuu pentru SEO
    e) Raport PDF cu toate URL-urile in 12 ore + factura + contact dedicat
    f) Zero efort: AGENTUL NOSTRU te ajuta sa redactezi articolul si cauta cele mai bune solutii pentru tematica firmei voastre, voi trimiteti doar 3 poze
    g) BONUS UNIC IN PIATA: Strateg Editorial AI gratuit - intri cu site-ul vostru pe mediaexpress.ro/strateg-ai si primesti in 30 sec 5 idei de articole personalizate brandului + pachet recomandat. NIMENI altcineva in Romania nu ofera asta - te ajuta sa iei cele mai bune decizii editoriale inainte sa platesti ceva.
  PUNE OPTIUNEA (g) OBLIGATORIU - este diferentiatorul cheie vs competitia. Restul: alege 4 din a-f in functie de industrie.
  + social proof scurt: "colaboram cu June, Emblema, WhitePress si magazine online de renume din RO"
  PARAGRAFUL 2 = recomanda pachetul:
    - DEFAULT firme normale: Pachet National 50 (1500 RON) - 41 locale + 9 nationale + 50 Facebook + 50 backlinks permanente
    - DACA E iGaming/cazino: Pachet Cazino National (2500 RON), conform ONJN
  + mentioneaza ca agentul nostru ajuta cu redactarea, voi furnizati doar tematica + 3 poze
- CTA: INTERZIS apel/meeting/proforma. Daca LINK CTA UNIC exista: "Vezi oferta + lista 50 ziare + testeaza Strategul AI gratuit + completeaza datele aici:" + link. Daca NU: "Testati Strategul Editorial AI gratuit pe mediaexpress.ro/strateg-ai (30 sec) si raspundeti cu DA daca vreti detaliile complete."
- semnatura: "Echipa MediaExpres - mediaexpress.ro"
- TON profesional, NU pushy
- limba romana cu diacritice

Raspunde STRICT JSON cu "subject" si "body". "body" text plain cu \\n\\n intre paragrafe.`;

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

  const userPrompt = `${ctx}\n\nGenereaza un email de outreach pentru aceasta firma. REGULI CRITICE:\n1. PROPOZITIA 1 = exact textul brand pitch (cea mai mare retea, 50 publicatii, DA 37, trafic solid, 50 Facebook)\n2. PROPOZITIA 2 = personalizata sau fallback generic, NICIODATA placeholders\n3. NU folosi cuvantul "AI" pentru redactare - foloseste "agentul nostru". EXCEPTIE: "Strateg Editorial AI" e nume de produs si trebuie folosit cu majuscule.\n4. PARAGRAFUL 1 OBLIGATORIU include optiunea (g) STRATEG EDITORIAL AI - acesta e diferentiatorul vs competitia.\n5. Cifre permise doar: 50/1/9/DA 37/12h/1500 RON. NU 2M cititori. NU procente.\n6. CTA: link to /oferta/[token] sau mediaexpress.ro/strateg-ai pentru test gratuit.`;

  const text = await callOpenAI({
    system,
    user: userPrompt,
    model: MODEL_FAST,
    maxTokens: 1200,
    contextTag: "outreach-email",
  });

  const parsed = parseJson<{ subject?: string; body?: string }>(text, "outreach-email");
  if (!parsed.subject || !parsed.body) throw new Error("Raspuns incomplet");

  // Safety net: scoatem placeholders [x] {y} si inlocuim mentiuni de "AI" cu "agentul nostru"
  // dar PASTRAM "Strateg Editorial AI" ca nume branded.
  const cleanText = (s: string) =>
    s
      .replace(/\[[^\]\n]{1,40}\]/g, "")
      .replace(/\{[^}\n]{1,40}\}/g, "")
      .replace(/<(?!\/?(a|br|p|strong|b|em|i)\b)[^>\n]{1,40}>/gi, "")
      // Replace generic "AI scrie/redacteaza" but NOT when preceded by "Strateg Editorial"
      .replace(/(?<!Strateg Editorial )\bAI[­\s-]+(scrie|redacteaza|genereaza|creeaza)\b/gi, "agentul nostru te ajuta sa $1")
      .replace(/\bAI-ul (nostru )?\b/gi, "agentul nostru ")
      .replace(/\binteligen[țt]a artificiala\b/gi, "agentul nostru")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/ \./g, ".")
      .replace(/ ,/g, ",")
      .trim();

  return {
    subject: cleanText(parsed.subject),
    body: cleanText(parsed.body),
  };
}
