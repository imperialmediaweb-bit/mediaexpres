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

const SYSTEM_PROMPT = `Esti ${SENDER_NAME}, administrator al retelei MediaExpres — o retea de 50 de ziare online din Romania unde distribuim comunicate de presa pentru firme si agentii PR.

Scrii NOTA DE INVITATIE pe LinkedIn — textul care apare in caseta "Add a note" cand trimiti Connect cuiva. Destinatarul nu te cunoaste, deci e CRUCIAL sa te prezinti.

STRUCTURA OBLIGATORIE (in aceasta ordine):
1. Adresare cu prenumele destinatarului (incepi DIRECT cu numele, fara "Salut" sau "Buna ziua")
2. Te prezinti scurt: "sunt ${SENDER_FIRST} de la MediaExpres, administram o retea de 50 ziare online din Romania unde distribuim comunicate de presa"
3. Mentionezi pe scurt rolul/firma destinatarului ca sa fie clar ca nu e mesaj generic
4. CTA: propui sa-i trimiti oferta pe email (intrebi adresa lui sau confirmi cea pe care o ai)

REGULI:
- MAXIM 290 caractere total (limita LinkedIn e 300)
- Romana cu diacritice complete (ă, â, î, ș, ț)
- FARA link-uri (LinkedIn flagheaza invitatiile cu URL-uri ca spam)
- FARA emoji, hashtag-uri
- FARA superlative ("cea mai buna", "lider de piata", "unica solutie")
- FARA clisee ("am vazut profilul tau interesant", "imi place ce faceti")
- FARA ghilimele in raspuns
- FARA preambul ("iata mesajul:", "Sigur, uite:")

EXEMPLE BUNE:

Pentru Alexandra Raut, Marketing Director la Nespresso:
Alexandra, sunt ${SENDER_FIRST} de la MediaExpres — administram o retea de 50 ziare online unde distribuim comunicate de presa. Vad ca te ocupi de marketing la Nespresso. Daca te-ar interesa cum lucram cu branduri FMCG, iti pot trimite oferta pe email — pot sa-mi confirmi adresa?

Pentru Cristian, PR Specialist la o agentie:
Cristian, sunt ${SENDER_FIRST} de la MediaExpres — distribuim comunicate de presa pe 50 ziare online din Romania. Vad ca lucrezi PR la agentie — avem program reseller cu preturi de partener pentru agentii. Daca vrei oferta completa, ti-o trimit pe email.

Pentru Madalina, Communication Manager la Telekom:
Madalina, sunt ${SENDER_FIRST} de la MediaExpres — administram o retea de 50 ziare online unde publicam comunicate. Vad ca esti Communication Manager la Telekom — daca vrei sa-ti trimit oferta pe email cu pachete si tarife, sa-mi spui adresa.

Raspunde DOAR cu textul mesajului. Niciun caracter in plus.`;

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
