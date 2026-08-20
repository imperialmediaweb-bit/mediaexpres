// Generare de advertoriale optimizate SEO pentru clientii care tocmai au platit.
//
// Traieste separat de `ai.ts` (care acopera comunicate de presa, calendare
// editoriale si outreach) pentru ca are alt contract de iesire: pe langa titlu
// si text, intoarce meta description si cuvinte-cheie.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export interface AdvertorialInput {
  /** Ce vrea clientul sa comunice, cu cuvintele lui. */
  brief: string;
  companyName?: string;
  /** Text extras de pe site-ul clientului, ca sa nu inventeze modelul detalii. */
  siteContext?: string;
  siteUrl?: string;
  city?: string;
  isCasino?: boolean;
}

export interface AdvertorialOutput {
  title: string;
  body: string;
  metaDescription: string;
  keywords: string[];
}

function buildSystemPrompt(isCasino: boolean): string {
  return `Esti redactor de continut pentru MediaExpres, o retea de 50 de ziare online din Romania. Scrii ADVERTORIALE — articole publicitare care trebuie sa se citeasca ca un material util, nu ca o reclama stridenta.

Reguli de redactare:
- limba romana corecta, CU diacritice
- 500-700 de cuvinte
- structura: titlu + intro care prinde + 4-6 paragrafe cu subtitluri scurte + call-to-action clar la final
- ton publicitar, dar credibil: beneficii concrete, nu superlative goale
- NU inventa cifre, premii, parteneriate sau citate. Foloseste doar informatiile primite.
- daca o informatie lipseste, scrie in jurul ei, nu o fabrica

Reguli SEO:
- titlul contine cuvantul-cheie principal si are sub 65 de caractere
- primul paragraf repeta natural cuvantul-cheie principal
- foloseste subtitluri pentru scanabilitate
- "metaDescription": 140-155 caractere, cu indemn la actiune
- "keywords": 5-8 cuvinte-cheie relevante pentru cautari reale in romana${
    isCasino
      ? `

CONTINUT IGAMING — obligatoriu:
- respecta reglementarile ONJN
- include mentiunea despre joc responsabil si limita de varsta 18+
- fara promisiuni de castig, fara indemnuri agresive la pariere`
      : ""
  }

Raspunde STRICT in format JSON cu cheile "title", "body", "metaDescription", "keywords" (array de string-uri). Fara markdown, fara comentarii. "body" contine textul cu paragrafe separate prin \\n\\n; subtitlurile sunt linii scurte proprii.`;
}

function buildUserPrompt(input: AdvertorialInput): string {
  const parts = [`Ce vrea clientul sa comunice:\n${input.brief}`];
  if (input.companyName) parts.push(`Companie: ${input.companyName}`);
  if (input.city) parts.push(`Oras: ${input.city}`);
  if (input.siteUrl) parts.push(`Site: ${input.siteUrl}`);
  if (input.siteContext) {
    parts.push(
      `Informatii extrase de pe site-ul companiei (foloseste-le ca sursa de adevar):\n"""\n${input.siteContext}\n"""`
    );
  }
  parts.push("Scrie advertorialul.");
  return parts.join("\n\n");
}

export async function generateAdvertorial(
  input: AdvertorialInput
): Promise<AdvertorialOutput> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY lipseste");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt(Boolean(input.isCasino)) },
        { role: "user", content: buildUserPrompt(input) },
      ],
      max_tokens: 2500,
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[advertorial] OpenAI error", res.status, txt);
    throw new Error(`Generarea a esuat (${res.status})`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    console.error("[advertorial] raspuns gol", data);
    throw new Error("Raspuns gol de la model");
  }

  let parsed: {
    title?: string;
    body?: string;
    metaDescription?: string;
    keywords?: unknown;
  };
  try {
    const match = content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : content);
  } catch {
    console.error("[advertorial] JSON neparsabil", content);
    throw new Error("Raspunsul modelului nu a putut fi parsat");
  }

  if (!parsed.title || !parsed.body) throw new Error("Raspuns incomplet");

  return {
    title: parsed.title,
    body: parsed.body,
    metaDescription: parsed.metaDescription || "",
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k): k is string => typeof k === "string")
      : [],
  };
}
