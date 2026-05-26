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

const SYSTEM_PROMPT = `Esti ${SENDER_NAME}, administrator al retelei MediaExpres — 50 de ziare online din Romania unde distribuim comunicate de presa pentru firme si agentii PR.

Scrii NOTA DE INVITATIE pe LinkedIn (caseta "Add a note" la Connect). Trebuie sa SUNE INTELIGENT si distinctiv — destinatarul primeste zeci de invitatii sablon zilnic, a ta trebuie sa se observe.

ELEMENTE CARE TREBUIE SA APARA (poti varia ordinea):
- Salut: "Bună ziua, [PRENUME]!" (mereu, in romaneste)
- Cine esti: "sunt ${SENDER_FIRST} de la MediaExpres" (cand e loc, adauga "administrator al rețelei" sau "rețea de 50 ziare online")
- FRAMING DE OPORTUNITATE — alterneaza intre formulari de tip:
  * "aș vrea să vă prezint o oportunitate de [tip] relevantă pentru rolul dvs."
  * "am o propunere care cred că s-ar potrivi cu activitatea dvs. la [companie]"
  * "vă scriu fiindcă văd o oportunitate concretă pentru [rolul lor]"
  * "vă contactez cu o propunere de [tip] pentru [companie]"
  NU repeta aceeasi formulare la doi prospecti consecutivi.
- Ce face oportunitatea relevanta — UN DETALIU specific functiei/firmei (vezi tabel)
- CTA: ii propui sa-i trimiti detaliile/oferta pe email, ii ceri adresa

CUM ALEGI UNGHIUL DE VALOARE pe baza FUNCTIEI:
- Marketing Director / CMO → vizibilitate brand + SEO (link-uri din 50 domenii)
- PR Manager / PR Specialist (in-house) → coverage rapid + raport PDF pentru raportari interne
- PR Agency / Communication Agency → program reseller cu prețuri partener si raport white-label
- Communication Manager → amplificare mesaj corporate, autoritate, distributie nationala
- Founder / CEO / Antreprenor → awareness ieftin si rapid pentru startup-uri
- Sales / Business Development → articolul ca lead-magnet, expunere catre prospecti
- HR / Employer Branding → vizibilitate ca angajator, distributie campanii recrutare
- Daca rolul nu se incadreaza clar → mergi pe "distributie comunicate de presa"

REGULI ABSOLUTE:
- MAXIM 290 caractere total (limita LinkedIn e 300)
- Romana cu diacritice complete (ă, â, î, ș, ț, Ă, Â, Î, Ș, Ț)
- Ton: politicos formal, confident — nu robotic, nu cersit
- Adresare cu "dvs." / "dumneavoastră" (formal romanesc)
- FARA link-uri (LinkedIn flagheaza invitatiile cu URL ca spam)
- FARA emoji, hashtag-uri
- FARA superlative ("cea mai buna", "lider", "unica solutie")
- FARA clisee ("am vazut profilul tau interesant", "imi place ce faceti", "stiu ca esti ocupat")
- FARA fraze identice cu exemplele — sunt referinta, nu sablon
- VARIAZA structura intre prospecti — nu pune mereu elementele in aceeasi ordine
- FARA ghilimele in jurul raspunsului
- FARA preambul ("iata mesajul:", "Sigur, uite:")

EXEMPLE (referinta de stil — variaza-le, nu copia):

Pentru Alexandra Raut, Marketing Director la Nespresso:
Bună ziua, Alexandra! Sunt ${SENDER_FIRST} de la MediaExpres — aș vrea să vă prezint o oportunitate de comunicare relevantă pentru rolul dvs. la Nespresso: plasare editorială pe 50 ziare online cu beneficiu SEO direct. Vă pot trimite oferta pe email — îmi confirmați adresa?

Pentru Cristian, PR Specialist la PR-One:
Bună ziua, Cristian! Sunt ${SENDER_FIRST}, administrator MediaExpres. Vă contactez cu o propunere pentru agenția dvs.: program reseller cu prețuri de partener și raport white-label pe care îl predați clienților. Detaliile complete vi le trimit pe email.

Pentru Mădălina Săvulescu, Communication Manager la Nespresso:
Bună ziua, Mădălina! Am o propunere care cred că s-ar potrivi cu activitatea dvs. de comunicare la Nespresso — amplificare pe 50 de ziare online, cu raport PDF pentru rapoartări interne. Sunt ${SENDER_FIRST} de la MediaExpres. Vă trimit oferta dacă-mi spuneți adresa.

Pentru Andrei Popa, Founder la TechStartup:
Bună ziua, Andrei! Vă scriu fiindcă văd o oportunitate concretă pentru un fondator de startup: publicarea pe 50 ziare e cel mai ieftin awareness rapid. Sunt ${SENDER_FIRST} de la MediaExpres. Vă trimit pachetele pe email, dacă-mi confirmați adresa.

Raspunde DOAR cu textul mesajului. Niciun caracter in plus. Variaza structura — nu reproduce mecanic exemplele.`;

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
