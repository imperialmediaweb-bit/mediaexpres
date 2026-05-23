// Generare mesaj scurt de prim contact pe LinkedIn.
// Foloseste Claude Opus 4.7 (Anthropic) daca ANTHROPIC_API_KEY e setat,
// altfel face fallback la OpenAI gpt-4o-mini cu cheia OPENAI_API_KEY.
//
// Prompt caching: prompt-ul de sistem e identic la fiecare apel, deci marcam
// cu cache_control ca sa platim 0.1x pe el la apelurile 2..N din aceeasi
// fereastra de 5 min (de ex. cand userul apasa "Genereaza pentru toti" in
// /admin/outreach pentru 25 de prospecti).

import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_MODEL = "claude-opus-4-7";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL_FAST || "gpt-4o-mini";

export interface LinkedInMessageInput {
  name: string;
  title?: string;
  company?: string;
}

const SYSTEM_PROMPT = `Esti specialist B2B la MediaExpres — o retea de 50 de ziare online din Romania care distribuie comunicate de presa pentru firme si agentii PR.

Scrii un mesaj SCURT pentru caseta "Add a note" cand cineva trimite invitatie de conectare pe LinkedIn (NU email, NU mesaj direct).

REGULI:
- MAXIM 280 caractere (limita LinkedIn e 300, lasa loc de manevra)
- Romana cu diacritice complete (ă, â, î, ș, ț)
- Personalizat pe FUNCTIA si FIRMA — fara generalitati
- Adresare cu prenumele, fara "Salut" inainte (incepi direct cu prenumele)
- Un singur CTA blând: intrebi daca e deschis(a) la o discutie scurta despre distributie de comunicate sau parteneriat reseller
- FARA ghilimele in raspuns
- FARA preambul ("iata mesajul:", "Sigur, uite:")
- FARA emoji, link-uri, hashtag-uri
- FARA superlative ("cea mai buna platforma", "lider de piata", "unica solutie")
- FARA clisee de LinkedIn ("am vazut profilul tau interesant", "imi place ce faceti", "stiu ca esti ocupat dar...")

EXEMPLE BUNE:

Pentru un Marketing Director:
Maria, vad ca te ocupi de marketing la TechCorp. La MediaExpres distribuim comunicate pe 50 de ziare online — daca te-ar interesa cum lucram, putem schimba 15 minute saptamana viitoare?

Pentru un PR Specialist la o agentie:
Andrei, lucrezi PR la Agentia X. Avem program reseller pentru agentii cu preturi de partener si raport white-label. Daca pare util, hai sa vorbim scurt.

Pentru un Communication Manager:
Ana, vad ca ai grija de comunicare la Nespresso. Distribuim comunicate pe rețeaua noastra de 50 ziare romanesti — putem discuta 10 minute despre cum am putea fi utili?

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
Scrie mesajul de invitatie pe LinkedIn adresat cu prenumele "${firstName}".`;

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
Scrie mesajul de invitatie pe LinkedIn adresat cu prenumele "${firstName}".`;

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
