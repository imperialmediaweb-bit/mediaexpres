// Minimal Anthropic Messages API wrapper via fetch, avoids bundling the SDK.
// Uses Claude Sonnet for article drafts (fast + good quality).
// Docs: https://docs.claude.com/en/api/messages

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

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

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
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY lipseste");

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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[ai] Anthropic press-release error", res.status, txt);
    throw new Error("Generarea a esuat");
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (data.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text || "")
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const raw = jsonMatch ? jsonMatch[0] : text;
  try {
    const parsed = JSON.parse(raw) as { title?: string; body?: string };
    if (!parsed.title || !parsed.body) throw new Error("Raspuns incomplet");
    return { title: parsed.title, body: parsed.body };
  } catch {
    console.error("[ai] could not parse press-release JSON", text);
    throw new Error("Raspunsul modelului nu a putut fi parsat");
  }
}

export interface TitleVariant {
  title: string;
  ctrScore: number;
  reasoning: string;
}

export async function generateTitleVariants(
  topic: string
): Promise<TitleVariant[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY lipseste");

  const system = `Esti un expert in copywriting jurnalistic pentru piata din Romania. Generezi 5 variante de titlu pentru un articol/comunicat de presa dat. Pentru fiecare titlu evaluezi probabil-CTR pe o scara 1-100, bazat pe:
- claritatea promisiunii (cititorul intelege beneficiul instant)
- specificitate (cifre, nume, locuri concrete bat generic-ul)
- emotie/curiozitate fara clickbait
- lungime optima 50-70 caractere
- adaptat publicului romanesc, fara jargonisme

Raspunde STRICT in format JSON cu cheia "variants": un array de exact 5 obiecte, fiecare cu cheile "title" (string), "ctrScore" (numar intreg 1-100), "reasoning" (string scurt — max 80 caractere — explicand de ce e bun sau slab). Fara markdown, fara comentarii.`;

  const userPrompt = `Tema: ${topic}\n\nGenereaza 5 variante de titlu cu evaluare CTR.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[ai] title variants error", res.status, txt);
    throw new Error("Generarea titlurilor a esuat");
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (data.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text || "")
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const raw = jsonMatch ? jsonMatch[0] : text;
  try {
    const parsed = JSON.parse(raw) as { variants?: unknown };
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
  } catch {
    console.error("[ai] could not parse title variants JSON", text);
    throw new Error("Raspunsul modelului nu a putut fi parsat");
  }
}

export async function generateArticle(
  input: GenerateArticleInput
): Promise<GenerateArticleOutput> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY lipseste");
  }

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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[ai] Anthropic error", res.status, txt);
    throw new Error("Generarea a esuat");
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (data.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text || "")
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const raw = jsonMatch ? jsonMatch[0] : text;
  try {
    const parsed = JSON.parse(raw) as { title?: string; body?: string };
    if (!parsed.title || !parsed.body) throw new Error("Raspuns incomplet");
    return { title: parsed.title, body: parsed.body };
  } catch {
    console.error("[ai] could not parse JSON from model output", text);
    throw new Error("Raspunsul modelului nu a putut fi parsat");
  }
}

export interface EditorialMonth {
  month: number;
  monthName: string;
  theme: string;
  hook: string;
  suggestedFormat: "lansare" | "eveniment" | "rezultate" | "extindere" | "altceva";
}

export async function generateEditorialCalendar(
  industry: string,
  companyContext: string
): Promise<EditorialMonth[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY lipseste");

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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[ai] editorial calendar error", res.status, txt);
    throw new Error("Generarea calendarului a esuat");
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (data.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text || "")
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const raw = jsonMatch ? jsonMatch[0] : text;
  try {
    const parsed = JSON.parse(raw) as { calendar?: unknown };
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
  } catch {
    console.error("[ai] could not parse editorial calendar JSON", text);
    throw new Error("Raspunsul modelului nu a putut fi parsat");
  }
}

export interface OutreachEmailInput {
  companyName: string;
  industry?: string;
  city?: string;
  website?: string;
  notes?: string;
}

export interface OutreachEmail {
  subject: string;
  body: string;
}

export async function generateOutreachEmail(
  input: OutreachEmailInput
): Promise<OutreachEmail> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY lipseste");

  const system = `Esti un copywriter B2B specializat in cold-email pentru piata din Romania. Scrii email-uri scurte (200-300 cuvinte) catre potentiali clienti, oferindu-le serviciul MediaExpres: publicare comunicate de presa pe 50 de ziare cu pachet de la 150 RON (Local) la 1500 RON (National 50).

Reguli:
- subject scurt si specific (max 60 caractere), care personalizeaza catre firma
- intro: 1 propozitie care arata ca ai cercetat firma (gen "am vazut ca activati in [domeniu] din [oras]")
- body: 2 paragrafe scurte care explica beneficiul concret pentru ei
- CTA clar la final: "Raspunde-mi cu un da si trimit detalii", sau invitatie la apel scurt
- semnatura: "Echipa MediaExpres - mediaexpress.ro"
- TON profesional, NU pushy, NU clickbait
- limba romana cu diacritice

Raspunde STRICT in format JSON cu cheile "subject" si "body". "body" e text plain cu \\n\\n intre paragrafe. Fara markdown, fara comentarii.`;

  const ctx = [
    `Companie: ${input.companyName}`,
    input.industry ? `Industrie: ${input.industry}` : "",
    input.city ? `Oras: ${input.city}` : "",
    input.website ? `Site web: ${input.website}` : "",
    input.notes ? `Note: ${input.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `${ctx}\n\nGenereaza un email de outreach pentru aceasta firma.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[ai] outreach email error", res.status, txt);
    throw new Error("Generarea email-ului a esuat");
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (data.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text || "")
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const raw = jsonMatch ? jsonMatch[0] : text;
  try {
    const parsed = JSON.parse(raw) as { subject?: string; body?: string };
    if (!parsed.subject || !parsed.body) throw new Error("Raspuns incomplet");
    return { subject: parsed.subject, body: parsed.body };
  } catch {
    console.error("[ai] could not parse outreach email JSON", text);
    throw new Error("Raspunsul modelului nu a putut fi parsat");
  }
}
