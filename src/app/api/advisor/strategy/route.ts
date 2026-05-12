import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  brandInput: z.string().min(2).max(300),
  briefDescription: z.string().max(800).optional().or(z.literal("")),
  prospectCompany: z.string().max(200).optional(),
  prospectIndustry: z.string().max(200).optional(),
  prospectCity: z.string().max(100).optional(),
});

const MONTH_LABELS = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

const SYSTEM_PROMPT = `Esti un strateg PR senior pentru MediaExpres care construieste strategii editoriale personalizate pentru clientii care navigheaza pagina de oferta.

CONTEXT MEDIAEXPRES:
- Cea mai mare retea de presa online din Romania
- 50 publicatii online (41 locale, cate 1 per judet + 9 nationale)
- DA 37, trafic solid
- 50 pagini Facebook asociate
- Articol redactional jurnalistic (NU reclama platita)
- Linkuri permanente, raport PDF in 12h
- Agentul nostru ajuta cu redactarea (3 poze de la client)
- Parteneri: June, Emblema Grup, WhitePress, magazine online de renume

PACHETE:
- Local: 150 RON - 1 publicatie judeteana
- Regional: 500 RON - 10 publicatii intr-o regiune (Moldova/Transilvania/Muntenia/Banat)
- National 50: 1500 RON - 50 publicatii + 50 Facebook + 50 backlinks - DEFAULT POPULAR
- Abonament Bronze: 1300 RON/luna - 1 articol/luna
- Abonament Silver: 2400 RON/luna - 2 articole/luna
- Abonament Gold: 4500 RON/luna - 4 articole/luna - RECOMANDAT PENTRU CLIENTI RECURENTI
- Abonament Platinum: 8000 RON/luna - 8 articole/luna
- Cazino (iGaming, ONJN): Local 300 / Regional 900 / National 2500

TIPURI DE ARTICOLE (alege din lista):
- lansare = lansare de produs/serviciu/locatie/site
- eveniment = anunt eveniment, conferinta, workshop
- parteneriat = parteneriat strategic cu alta firma
- rezultate = bilant anual, cifre crestere, raport financiar
- extindere = sediu nou, magazin nou, expansiune
- premii = distinctie, certificare, top industrie
- educational = ghid/tutorial pe nisa firmei (ex: "Cum alegi un dentist in Cluj")
- announcement = anunt corporativ general

TASK:
Primesti un brand (URL site sau nume firma) + optional descriere scurta. Vei genera o STRATEGIE EDITORIALA personalizata:

1. brandSnapshot: 2-3 propozitii care arata ca ai inteles brandul (ce face, target audience, propunere unica de valoare). Daca primesti DOAR un URL fara descriere si nu poti deduce, fa o ipoteza educata bazata pe numele URL-ului si spune "presupunand ca...". Nu inventa cifre.

2. ideas: array de EXACT 5 idei de articole, fiecare cu:
   - title: titlu sugerat (50-70 caractere, specific brandului, NU generic)
   - type: unul din tipurile de mai sus
   - month: una din lunile ["Ianuarie", "Februarie", ..., "Decembrie"] - alege luna optima pentru fiecare idee (sezonalitate)
   - whyItWorks: 1 propozitie scurta (max 100 caractere) explicand de ce ACEASTA idee functioneaza pentru ACEST brand specific (NU sablon generic)

3. recommendedPackage: alege un pachet/abonament concret din lista (cu pret in nume, ex "Pachet National 50 (1500 RON)" sau "Abonament Gold (4500 RON/luna)")

4. recommendedPackageReason: 1 propozitie scurta (max 120 caractere) de ce ESTE potrivit acest pachet pentru ACEST brand (nu generic)

5. recommendedFrequency: una din ["One-shot single article", "Trimestrial - 4 articole/an", "Bimestrial - 6 articole/an", "Lunar via abonament"]

6. recommendedFrequencyReason: 1 propozitie scurta de ce aceasta frecventa

REGULI CRITICE:
- Idei SPECIFICE acestui brand, NU generice ("despre serviciile noastre" e RAU; "Cum alegi o clinica de implant dentar in Cluj - ghid 2026" e BUN)
- Folosesti DOAR pachetele MediaExpres din lista de mai sus
- NU folosi cuvantul "AI" sau "automatizare" in raspuns; foloseste "echipa noastra", "agentul nostru"
- Limba romana cu diacritice
- Variaza tipurile articolelor in cele 5 idei (nu toate "lansare")
- Variaza lunile (nu toate in Ianuarie)
- Daca brandul e iGaming/cazino -> foloseste pachetele Cazino + mentioneaza ONJN-compliance in 1-2 idei
- Daca brandul e foarte mic/local -> recomanda Local sau Regional (NU pushy spre National)
- Daca brandul are descriere de eCommerce/national -> National 50 + abonament Gold

OUTPUT STRICT JSON cu cheile exact:
{
  "brandSnapshot": "string",
  "ideas": [
    {"title": "string", "type": "lansare|eveniment|parteneriat|rezultate|extindere|premii|educational|announcement", "month": "Ianuarie|...|Decembrie", "whyItWorks": "string"},
    ... exact 5 elemente ...
  ],
  "recommendedPackage": "string",
  "recommendedPackageReason": "string",
  "recommendedFrequency": "string",
  "recommendedFrequencyReason": "string"
}

Fara markdown, fara comentarii, doar JSON valid.`;

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
    }
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
        { status: 400 }
      );
    }
    const {
      brandInput,
      briefDescription,
      prospectCompany,
      prospectIndustry,
      prospectCity,
    } = parsed.data;

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.error("[strategy] OPENAI_API_KEY missing");
      return NextResponse.json(
        { ok: false, error: "Configurare incompleta. Scrie-ne la contact@mediaexpress.ro." },
        { status: 500 }
      );
    }

    const userParts: string[] = [`Brand (URL site sau nume firma): ${brandInput}`];
    if (briefDescription) userParts.push(`Descriere scurta: ${briefDescription}`);
    if (prospectCompany) userParts.push(`Vizitator pagina oferta: ${prospectCompany}`);
    if (prospectIndustry) userParts.push(`Industrie cunoscuta: ${prospectIndustry}`);
    if (prospectCity) userParts.push(`Oras cunoscut: ${prospectCity}`);
    userParts.push(
      "\nGenereaza strategia editoriala completa in JSON conform formatului specificat."
    );

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userParts.join("\n") },
        ],
        max_tokens: 1800,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[strategy] OpenAI error:", res.status, errText);
      return NextResponse.json(
        { ok: false, error: "Strategul nu poate genera acum. Scrie-ne la contact@mediaexpress.ro." },
        { status: 500 }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data?.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "Raspuns gol" },
        { status: 500 }
      );
    }

    type Idea = {
      title: string;
      type: string;
      month: string;
      whyItWorks: string;
    };
    type Strategy = {
      brandSnapshot: string;
      ideas: Idea[];
      recommendedPackage: string;
      recommendedPackageReason: string;
      recommendedFrequency: string;
      recommendedFrequencyReason: string;
    };

    let parsedJson: Strategy;
    try {
      parsedJson = JSON.parse(raw) as Strategy;
    } catch {
      console.error("[strategy] JSON parse failed:", raw);
      return NextResponse.json(
        { ok: false, error: "Format raspuns invalid" },
        { status: 500 }
      );
    }

    if (
      !parsedJson?.brandSnapshot ||
      !Array.isArray(parsedJson.ideas) ||
      parsedJson.ideas.length === 0 ||
      !parsedJson.recommendedPackage
    ) {
      console.error("[strategy] missing fields:", parsedJson);
      return NextResponse.json(
        { ok: false, error: "Raspuns incomplet de la model" },
        { status: 500 }
      );
    }

    const cleanText = (s: string) =>
      (s || "")
        .replace(/\bAI[­\s-]+(scrie|redacteaza|genereaza|creeaza)\b/gi, "echipa noastra $1")
        .replace(/\bAI-ul (nostru )?\b/gi, "echipa noastra ")
        .replace(/\binteligen[țt]a artificiala\b/gi, "echipa noastra")
        .trim();

    const validMonths = new Set(MONTH_LABELS);
    const validTypes = new Set([
      "lansare",
      "eveniment",
      "parteneriat",
      "rezultate",
      "extindere",
      "premii",
      "educational",
      "announcement",
    ]);

    const cleanedIdeas = parsedJson.ideas.slice(0, 5).map((idea) => ({
      title: cleanText(idea.title || "Idee articol"),
      type: validTypes.has(idea.type) ? idea.type : "announcement",
      month: validMonths.has(idea.month) ? idea.month : "Ianuarie",
      whyItWorks: cleanText(idea.whyItWorks || ""),
    }));

    return NextResponse.json({
      ok: true,
      strategy: {
        brandSnapshot: cleanText(parsedJson.brandSnapshot),
        ideas: cleanedIdeas,
        recommendedPackage: cleanText(parsedJson.recommendedPackage),
        recommendedPackageReason: cleanText(parsedJson.recommendedPackageReason || ""),
        recommendedFrequency: cleanText(parsedJson.recommendedFrequency),
        recommendedFrequencyReason: cleanText(parsedJson.recommendedFrequencyReason || ""),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Eroare server";
    console.error("[strategy] crash:", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
