// Generare de advertoriale optimizate SEO: in formularul de comanda si dupa plata.
//
// Traieste separat de `ai.ts` (care acopera comunicate de presa, calendare
// editoriale si outreach) pentru ca are alt contract de iesire: pe langa titlu
// si text, intoarce meta description si cuvinte-cheie.

import Anthropic from "@anthropic-ai/sdk";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/**
 * 29.09.2026 — clientul alege ce fel de text vrea (cerut de proprietar):
 * comunicat de presa, advertorial sau articol SEO. Acelasi formular, alte
 * reguli de scris.
 */
export const TIPURI_ARTICOL = ["advertorial", "comunicat", "seo"] as const;
export type TipArticol = (typeof TIPURI_ARTICOL)[number];

export interface AdvertorialInput {
  /** Ce vrea clientul sa comunice, cu cuvintele lui. */
  brief: string;
  tip?: TipArticol;
  /** La articolul SEO: cautarea pe care vrea sa apara. */
  cuvantCheie?: string;
  /** Linkurile cerute de client (cuvant -> adresa), text liber. */
  linkuri?: string;
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

const REGULI_TIP: Record<TipArticol, string> = {
  advertorial: `Scrii un ADVERTORIAL — articol publicitar care trebuie sa se citeasca ca un material util, nu ca o reclama stridenta.
- 500-700 de cuvinte
- structura: titlu + intro care prinde + 4-6 paragrafe cu subtitluri scurte + call-to-action clar la final
- ton publicitar, dar credibil: beneficii concrete, nu superlative goale`,
  comunicat: `Scrii un COMUNICAT DE PRESA — stire despre companie, asa cum ar prelua-o un ziar.
- 350-500 de cuvinte
- persoana a treia, ton neutru, jurnalistic; fara indemnuri de vanzare, fara superlative
- primul paragraf raspunde la: cine, ce, cand, unde, de ce
- apoi detaliile, in ordinea importantei; subtitluri doar daca textul le cere
- citate DOAR daca clientul a dat unul; nu inventa declaratii
- la final, un paragraf scurt „Despre [companie]" cu datele primite`,
  seo: `Scrii un ARTICOL SEO — un ghid informativ care raspunde la o cautare reala pe Google, cu firma mentionata natural.
- 700-900 de cuvinte
- construit in jurul cuvantului-cheie principal: in titlu, in primul paragraf, in 1-2 subtitluri si natural in text, fara umplutura
- 4-6 subtitluri, unele formulate ca intrebari pe care oamenii le cauta
- continut util chiar si pentru cine nu cumpara nimic; firma apare ca exemplu sau solutie de 2-3 ori, nu in fiecare paragraf
- incheiere scurta cu o recomandare, fara ton agresiv de vanzare`,
};

function buildSystemPrompt(isCasino: boolean, tip: TipArticol): string {
  return `Esti redactor de continut pentru MediaExpres, o retea de 50 de ziare online din Romania.

${REGULI_TIP[tip]}

Reguli de redactare:
- limba romana corecta, CU diacritice
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
  if (input.cuvantCheie) parts.push(`Cuvantul-cheie principal: ${input.cuvantCheie}`);
  if (input.linkuri) {
    parts.push(
      `Clientul vrea linkuri pe anumite cuvinte (le punem noi la publicare):\n"""\n${input.linkuri}\n"""\nFoloseste EXACT aceste expresii in text, cate o data fiecare, in propozitii firesti. Nu scrie adresele web in text.`
    );
  }
  if (input.siteContext) {
    parts.push(
      `Informatii extrase de pe site-ul companiei (foloseste-le ca sursa de adevar):\n"""\n${input.siteContext}\n"""`
    );
  }
  parts.push(
    input.tip === "comunicat" ? "Scrie comunicatul." : input.tip === "seo" ? "Scrie articolul SEO." : "Scrie advertorialul."
  );
  return parts.join("\n\n");
}

/**
 * 17.10.2026 — articolele se scriu cu Claude. Contul OpenAI a ramas fara
 * credit pe 13.10 si de atunci niciun articol nu se mai genera (nici in
 * formularul de comanda, nici dupa plata). OpenAI ramane doar plasa, daca
 * cheia Anthropic lipseste.
 */
async function scrieCuClaude(cheie: string, system: string, user: string): Promise<string> {
  const client = new Anthropic({ apiKey: cheie });
  const raspuns = await client.beta.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    // Gandirea consuma din acelasi buget; un articol taiat la jumatate e mai
    // rau decat unul lung.
    max_tokens: 8000,
    // Efort mic: clientul asteapta articolul pe ecran (promis „gata in 30 de
    // secunde"), iar un advertorial nu e o problema grea.
    output_config: { effort: "low" },
    // Daca filtrele de siguranta refuza cererea, o reia singur alt model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: [{ role: "user", content: user }],
  });
  if (raspuns.stop_reason === "refusal") throw new Error("Cererea a fost refuzata de model");
  return raspuns.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function scrieCuOpenAI(cheie: string, system: string, user: string): Promise<string> {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cheie}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
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
  return data.choices?.[0]?.message?.content || "";
}

export async function generateAdvertorial(
  input: AdvertorialInput
): Promise<AdvertorialOutput> {
  const system = buildSystemPrompt(Boolean(input.isCasino), input.tip || "advertorial");
  const user = buildUserPrompt(input);

  const cheieClaude = process.env.ANTHROPIC_API_KEY;
  const cheieOpenAI = process.env.OPENAI_API_KEY;
  let content: string;
  if (cheieClaude) {
    content = await scrieCuClaude(cheieClaude, system, user);
  } else if (cheieOpenAI) {
    content = await scrieCuOpenAI(cheieOpenAI, system, user);
  } else {
    throw new Error("Nicio cheie AI setata (ANTHROPIC_API_KEY / OPENAI_API_KEY)");
  }
  if (!content) {
    console.error("[advertorial] raspuns gol");
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
