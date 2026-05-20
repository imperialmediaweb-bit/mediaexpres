// Generare mesaj scurt de prim contact pe LinkedIn, folosit de extensia Chrome.
// Modul self-contained (wrapper minimal peste OpenAI) ca sa nu atinga ai.ts.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL_FAST = process.env.OPENAI_MODEL_FAST || "gpt-4o-mini";

export interface LinkedInMessageInput {
  name: string;
  title?: string;
  company?: string;
}

export async function generateLinkedInMessage(
  input: LinkedInMessageInput,
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY lipseste");

  const firstName = input.name.trim().split(/\s+/)[0];
  const system = `Esti specialist B2B la MediaExpres, o retea de 50 de ziare online din Romania care distribuie comunicate de presa pentru firme si agentii PR.
Scrii un mesaj SCURT de prim contact pe LinkedIn (NU email). Reguli:
- maxim 300 de caractere, 2-3 propozitii
- limba romana cu diacritice, ton profesional si cald, nu agresiv
- personalizat pe functia si firma destinatarului
- fara link-uri, fara emoji-uri, fara superlative
- un singur CTA discret: intrebi daca e deschis(a) la o scurta discutie despre distributie de comunicate / parteneriat reseller
Raspunde STRICT JSON cu cheia "message", fara markdown.`;

  const userPrompt = `Destinatar: ${input.name}${input.title ? `, ${input.title}` : ""}${input.company ? `, la ${input.company}` : ""}.
Scrie mesajul de LinkedIn adresat cu prenumele "${firstName}".`;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL_FAST,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 400,
      response_format: { type: "json_object" },
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
  if (!content) throw new Error("Raspuns gol de la model");

  let parsed: { message?: string };
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    throw new Error("Raspunsul modelului nu a putut fi parsat");
  }
  if (!parsed.message) throw new Error("Raspuns incomplet");

  return parsed.message.replace(/\[[^\]\n]{1,40}\]/g, "").replace(/\s{2,}/g, " ").trim();
}
