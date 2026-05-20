// Discovery prospecți B2B — cere OpenAI o listă de firme REALE (agenții PR /
// marketing) cu website-ul lor. Emailul NU se cere modelului (l-ar inventa);
// se extrage ulterior din site-ul real al firmei, în endpoint-ul de discover.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export interface DiscoveredAgency {
  companyName: string;
  website: string;
  city?: string;
  industry?: string;
}

export interface DiscoverInput {
  query?: string;
  city?: string;
  count?: number;
}

export async function discoverAgencies(
  input: DiscoverInput,
): Promise<DiscoveredAgency[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY lipseste");

  const count = Math.min(Math.max(input.count ?? 20, 1), 40);
  const focus = input.query?.trim() || "agentii de PR, comunicare si marketing";
  const cityFilter = input.city?.trim()
    ? ` Concentreaza-te pe firme din ${input.city.trim()} si imprejurimi.`
    : "";

  const system = [
    "Esti un cercetator de piata B2B specializat pe Romania. Sarcina ta: listezi firme REALE, existente si verificabile.",
    "",
    "REGULI CRITICE:",
    "- Doar firme reale care exista efectiv. NU inventa nume sau website-uri.",
    "- Pentru fiecare firma da website-ul oficial corect (domeniul real, ex: lighthousepr.ro).",
    "- NU inventa adrese de email - nu le cere nimeni de la tine.",
    "- Da doar firme pentru care esti sigur ca website-ul exista.",
    "- Prefera firme mici si medii (sub 50 angajati) - sunt mai receptive la outreach.",
    "- Raspunde DOAR cu JSON valid.",
  ].join("\n");

  const user = [
    `Listeaza ${count} firme reale din Romania din categoria: ${focus}.${cityFilter}`,
    "",
    "Returneaza JSON in formatul exact:",
    '{ "agencies": [ { "companyName": "Nume Firma SRL", "website": "domeniu.ro", "city": "Oras", "industry": "Agentie PR" } ] }',
    "",
    "Fara text in plus, doar JSON-ul.",
  ].join("\n");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 2000,
      response_format: { type: "json_object" },
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("[discover-agencies] OpenAI error", res.status, txt);
    throw new Error(`Descoperirea a esuat (${res.status})`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Raspuns gol de la model");

  let parsed: { agencies?: DiscoveredAgency[] };
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    console.error("[discover-agencies] JSON parse fail", content);
    throw new Error("Raspunsul modelului nu a putut fi parsat");
  }

  const list = Array.isArray(parsed.agencies) ? parsed.agencies : [];

  return list
    .filter(
      (a) => a && typeof a.companyName === "string" && typeof a.website === "string",
    )
    .map((a) => ({
      companyName: a.companyName.trim(),
      website: a.website
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .toLowerCase(),
      city: a.city?.trim() || undefined,
      industry: a.industry?.trim() || undefined,
    }))
    .filter((a) => a.companyName.length > 1 && /\.[a-z]{2,}$/i.test(a.website));
}
