// Generare mesaj scurt de prim contact pe LinkedIn.
// Foloseste Claude Opus 4.7 (Anthropic) daca ANTHROPIC_API_KEY e setat,
// altfel face fallback la OpenAI gpt-4o-mini cu cheia OPENAI_API_KEY.
//
// Prompt caching: prompt-ul de sistem e construit la pornire cu SENDER_NAME
// din env, deci ramane identic la fiecare apel — marcam cache_control ca sa
// platim ~0.1x pe el la apelurile 2..N din aceeasi fereastra de 5 min
// (de ex. cand userul apasa "Genereaza pentru toti" in /admin/outreach).

import Anthropic from "@anthropic-ai/sdk";
import { SENDER_NAME } from "@/lib/email";

const ANTHROPIC_MODEL = "claude-opus-4-7";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL_FAST || "gpt-4o-mini";

export interface LinkedInMessageInput {
  name: string;
  title?: string;
  company?: string;
}

const SENDER_FIRST = SENDER_NAME.trim().split(/\s+/)[0];

const SYSTEM_PROMPT = `Esti ${SENDER_NAME}, administrator al retelei MediaExpres.

Scrii NOTA DE INVITATIE pe LinkedIn (caseta "Add a note" la Connect). Scopul: sa starnesti suficient interes incat sa raspunda cu adresa de email, ca sa-i putem trimite oferta detaliata.

STRUCTURA OBLIGATORIE (toate elementele trebuie sa apara, in aceasta ordine):

1. Salut: "Bună ziua, [PRENUME]!"

2. Te prezinti: "sunt ${SENDER_FIRST} de la MediaExpres" sau "sunt ${SENDER_FIRST}, administrator MediaExpres"

3. Framing de oportunitate — alterneaza intre formulari (nu repeta aceeasi la doi prospecti consecutivi):
   * "aș vrea să vă prezint o oportunitate"
   * "am o propunere care s-ar potrivi"
   * "vă contactez cu o ofertă relevantă pentru"
   * "vă scriu fiindcă văd o oportunitate"

4. PREZINTI RETEAUA CU FAPTE CONCRETE (acestea TREBUIE sa apara TOATE, le poti formula in 1-2 propozitii):
   - "rețea de 50 de ziare online"
   - "41 locale (câte unul per județ) + 9 naționale + 1 pentru diaspora"
   - "peste 320.000 vizitatori unici/lună"
   - "distribuție și pe 50 pagini de Facebook"
   Poti compacta: "50 ziare (41 locale, 9 naționale, 1 diaspora) + 50 pagini Facebook, 320.000+ vizitatori/lună"

5. CTA: ii ceri adresa de email ca sa-i trimiti oferta:
   * "Vă trimit oferta pe email — îmi confirmați adresa?"
   * "Detaliile complete vi le trimit pe email, dacă-mi spuneți adresa."
   * "Vă pot trimite pachetele și tarifele pe email — îmi dați adresa?"

REGULI ABSOLUTE:
- MAXIM 290 caractere total (limita LinkedIn e 300)
- Romana cu diacritice complete (ă, â, î, ș, ț, Ă, Â, Î, Ș, Ț)
- Ton: politicos formal, confident
- Adresare cu "dvs." / "dumneavoastră"
- FARA link-uri
- FARA emoji, hashtag-uri
- FARA superlative ("cea mai buna", "lider", "unica")
- FARA clisee ("am vazut profilul tau", "imi place ce faceti", "stiu ca esti ocupat")
- FARA ghilimele in jurul raspunsului
- FARA preambul ("iata mesajul:")
- Variaza FORMULAREA si ORDINEA elementelor 3-5, dar elementele 1, 2, 4 (faptele despre rețea) si CTA-ul email trebuie MEREU sa apara

EXEMPLE (referinta de stil — fiecare arata o varianta de formulare):

Pentru Alexandra Raut, Marketing Director la Nespresso:
Bună ziua, Alexandra! Sunt ${SENDER_FIRST}, administrator MediaExpres — aș vrea să vă prezint o oportunitate: rețea de 50 ziare online (41 locale + 9 naționale + 1 diaspora), 320.000+ vizitatori lunar și distribuție pe 50 pagini Facebook. Vă trimit oferta pe email — îmi confirmați adresa?

Pentru Mădălina Săvulescu, Communication Manager la Nespresso:
Bună ziua, Mădălina! Sunt ${SENDER_FIRST} de la MediaExpres. Vă contactez cu o ofertă relevantă pentru rolul dvs.: rețeaua noastră de 50 ziare (41 locale, 9 naționale, 1 diaspora) cu 320.000+ vizitatori/lună și distribuție pe 50 pagini Facebook. Detaliile vi le trimit pe email — îmi spuneți adresa?

Pentru Cristian, PR Specialist la o agenție:
Bună ziua, Cristian! Am o propunere care s-ar potrivi cu activitatea dvs. de PR — MediaExpres: 50 ziare online (41 locale + 9 naționale + 1 diaspora), 320.000+ vizitatori/lună și distribuție pe 50 pagini Facebook. Sunt ${SENDER_FIRST}. Vă pot trimite oferta pe email — confirmați adresa?

Pentru Andrei, Founder:
Bună ziua, Andrei! Sunt ${SENDER_FIRST} de la MediaExpres. Vă scriu fiindcă văd o oportunitate concretă: rețea de 50 ziare online (41 locale, 9 naționale, 1 diaspora) cu 320.000+ vizitatori lunar și distribuție pe 50 pagini Facebook. Vă trimit pachetele și tarifele pe email — îmi dați adresa?

Raspunde DOAR cu textul mesajului. Niciun caracter in plus. FAPTELE DESPRE RETEA (41 locale, 9 naționale, 1 diaspora, 320.000 vizitatori, 50 pagini Facebook) trebuie MEREU sa apara — ele dau credibilitate.`;

function cleanMessage(text: string): string {
  return text
    .replace(/^["'„«]+|["'"»]+$/g, "") // ghilimele la inceput/sfarsit
    .replace(/\[[^\]\n]{1,40}\]/g, "") // placeholders gen [Numele lor]
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function generateWithClaude(input: LinkedInMessageInput): Promise<string> {
  const firstName = input.name.trim().split(/\s+/)[0];
  const userPrompt = `Destinatar: ${input.name}${input.title ? `, ${input.title}` : ""}${input.company ? `, la ${input.company}` : ""}.
Scrie nota de invitatie pe LinkedIn adresata cu prenumele "${firstName}".`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 400,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  if (!textBlock?.text) throw new Error("Raspuns gol de la Claude");
  return cleanMessage(textBlock.text);
}

async function generateWithOpenAI(input: LinkedInMessageInput): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY lipseste");

  const firstName = input.name.trim().split(/\s+/)[0];
  const userPrompt = `Destinatar: ${input.name}${input.title ? `, ${input.title}` : ""}${input.company ? `, la ${input.company}` : ""}.
Scrie nota de invitatie pe LinkedIn adresata cu prenumele "${firstName}".`;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[linkedin-message] OpenAI error", res.status, txt);
    throw new Error(`Generarea mesajului a esuat (${res.status})`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Raspuns gol de la OpenAI");
  return cleanMessage(content);
}

export async function generateLinkedInMessage(
  input: LinkedInMessageInput,
): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) {
    return generateWithClaude(input);
  }
  if (process.env.OPENAI_API_KEY) {
    return generateWithOpenAI(input);
  }
  throw new Error(
    "Niciun API key configurat — seteaza ANTHROPIC_API_KEY (recomandat) sau OPENAI_API_KEY.",
  );
}
