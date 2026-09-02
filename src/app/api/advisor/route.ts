import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAdvisorKnowledge } from "@/lib/advisor-knowledge";

export const runtime = "nodejs";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
  prospectCompany: z.string().max(200).optional(),
  prospectIndustry: z.string().max(200).optional(),
  prospectCity: z.string().max(100).optional(),
});

const BASE_SYSTEM_PROMPT = `Esti consultantul oficial MediaExpres care ajuta vizitatorul paginii de oferta sa decida ce pachet sa aleaga. RASPUNZI DOAR despre oferta MediaExpres - NU dai sfaturi generice despre PR/marketing.

${buildAdvisorKnowledge()}

REGULI DE RECOMANDARE (foloseste preturile EXACTE din lista de mai sus, nu inventa):
1. Buget mic / test rapid / o singura aparitie -> pachetul Local
2. Acoperire intr-o singura regiune / cateva judete -> pachetul Regional (precizezi regiunea potrivita din lista)
3. Acoperire nationala / vizibilitate maxima -> National 50 - RECOMANDAREA DEFAULT
4. Publica RECURENT (lunar) -> abonament Gold, sau Silver daca bugetul e mai mic
5. iGaming / cazino / pariuri -> DOAR pachetele Cazino, niciodata cele standard
6. Client NOU care ezita pe pret / spune ca e scump / vrea sa testeze -> Oferta promo de pe /oferta-500. Daca vrea prezenta constanta -> abonamentul promo lunar.

REGULI DE RASPUNS:
- SCURT - maxim 4-5 propozitii
- RECOMANDA mereu un pachet SPECIFIC cu pret
- NU fi vag ("depinde, sunt mai multe optiuni") - DECIDE ferm
- NU da sfaturi generice despre PR sau marketing
- Daca intrebarea NU e despre MediaExpres (ex: "ce e SEO?", "recomanzi Facebook ads?"), redirectioneaza politicos: "Sunt consultantul retelei MediaExpres si va pot ajuta cu alegerea pachetului de distributie. Aveti o intrebare despre pachete sau acoperire?"
- NU inventa fapte noi (cifre trafic exacte, procente, DR Ahrefs, nume publicatii). Foloseste DOAR informatia din context.
- COMANDA SE POATE FACE CHIAR IN ACEASTA CONVERSATIE. Sub casuta de scris exista butonul rosu "Comanda acum". Cand omul e decis, sau intreaba cum plateste / cum comanda, trimite-l ACOLO: "Apasati butonul rosu 'Comanda acum' de mai jos si va iau pas cu pas." NU il trimite pe alta pagina ca sa comande — pierde drumul.
- In chat se poate plati si cu cardul, si prin transfer bancar (OP). La OP, tot in chat se dau datele de facturare, articolul si pozele — NU trebuie sa fi platit ca sa comande: primeste factura pe email in aceeasi zi lucratoare (o emitem noi) si plateste pe baza ei. Dovada platii e optionala. Spune asta cand cineva intreaba de OP.
- Limba romana cu diacritice corecte
- Tonul: profesional, prietenos, decisiv
- Foloseste "agentul nostru va ajuta cu redactarea" NU "AI scrie"

Raspunde direct cu textul plain - FARA JSON, FARA markdown, FARA bullet points cu asteriscuri.`;

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
        { ok: false, error: "Date invalide" },
        { status: 400 }
      );
    }
    const { messages, prospectCompany, prospectIndustry, prospectCity } = parsed.data;

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.error("[advisor] OPENAI_API_KEY missing");
      return NextResponse.json(
        { ok: false, error: "Configurare incompleta. Scrie-ne la contact@mediaexpress.ro." },
        { status: 500 }
      );
    }

    let systemPrompt = BASE_SYSTEM_PROMPT;
    const prospectContext: string[] = [];
    if (prospectCompany) prospectContext.push(`Firma: ${prospectCompany}`);
    if (prospectIndustry) prospectContext.push(`Industrie: ${prospectIndustry}`);
    if (prospectCity) prospectContext.push(`Oras: ${prospectCity}`);
    if (prospectContext.length > 0) {
      systemPrompt += `\n\nCONTEXT DESPRE VIZITATORUL ACESTEI PAGINI DE OFERTA (foloseste pentru a personaliza recomandarea):\n${prospectContext.join("\n")}`;
    }

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10),
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL_FAST || "gpt-4o-mini",
        messages: openaiMessages,
        max_tokens: 400,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[advisor] OpenAI error:", res.status, errText);
      return NextResponse.json(
        { ok: false, error: "Consultantul nu poate raspunde acum. Scrie-ne la contact@mediaexpress.ro." },
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

    // Safety: scoatem mentiuni "AI scrie/AI redacteaza" daca scapa
    const answer = raw
      .replace(/\bAI[­\s-]+(scrie|redacteaza|genereaza|creeaza)\b/gi, "agentul nostru va ajuta sa $1")
      .replace(/\bAI-ul (nostru )?\b/gi, "agentul nostru ")
      .replace(/\binteligen[țt]a artificiala\b/gi, "agentul nostru");

    return NextResponse.json({ ok: true, answer });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Eroare server";
    console.error("[advisor] crash:", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
