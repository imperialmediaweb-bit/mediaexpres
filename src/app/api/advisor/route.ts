import { NextResponse } from "next/server";
import { z } from "zod";

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

CONTEXT MEDIAEXPRES:
- Cea mai mare retea de presa online din Romania
- 50 publicatii online (41 locale - cate 1 per judet, 9 nationale)
- DA 37, trafic solid
- 50 pagini Facebook asociate fiecarei publicatii
- Articol redactional jurnalistic (NU reclama platita) - apare ca stire
- Linkuri PERMANENTE - articolul ramane online ani de zile
- Raport PDF cu URL-uri + screenshot-uri in 12h de la publicare
- Factura post-publicare, contact dedicat per partener
- Agentul nostru ajuta clientul cu redactarea articolului (clientul trimite 1-2 propozitii de tematica + 3 poze)
- NU folosi cuvantul "AI" sau "automat"; foloseste "agentul nostru" sau "echipa noastra ajuta cu redactarea"

PARTENERI ACTUALI (folosesti subtil daca relevant): June, Emblema Grup, WhitePress, Blogatu, magazine online de renume din Romania.

REGIUNI (pentru Pachetul Regional):
- Moldova: Iasi, Bacau, Suceava, Botosani, Vaslui, Galati, Vrancea, Neamt
- Transilvania: Cluj, Brasov, Sibiu, Mures, Alba, Bistrita-Nasaud, Harghita, Covasna, Maramures, Salaj, Satu Mare, Bihor
- Muntenia + Bucuresti: Bucuresti+Ilfov, Prahova, Dambovita, Arges, Teleorman, Giurgiu, Calarasi, Ialomita, Buzau, Braila, Constanta, Tulcea
- Banat + Oltenia: Timis, Caras-Severin, Arad, Hunedoara, Dolj, Olt, Mehedinti, Gorj, Valcea

PACHETE STANDARD (firme normale, NU iGaming):
- Local: 150 RON - 1 publicatie judeteana - bun pentru TEST rapid sau acoperire intr-un singur oras/judet
- Regional: 500 RON - 10 publicatii dintr-o regiune (Moldova/Transilvania/Muntenia/Banat) - pentru vizibilitate zonala
- National 50: 1500 RON - 50 publicatii (41 locale + 9 nationale) + 50 pagini Facebook + 50 backlinks SEO permanente - RECOMANDARE DEFAULT, cel mai popular, raport pret-acoperire optim

ABONAMENTE LUNARE (pret per articol mai mic):
- Bronze: 1.300 RON/luna - 1 articol/luna x 50 publicatii
- Silver: 2.400 RON/luna - 2 articole/luna x 50 publicatii
- Gold: 4.500 RON/luna - 4 articole/luna x 50 publicatii (recomandat pentru firme cu volum constant)
- Platinum: 8.000 RON/luna - 8 articole/luna x 50 publicatii (pentru clienti foarte activi)

PACHETE CAZINO/iGAMING (conform reglementari ONJN, mentiune joc responsabil):
- Cazino Local: 300 RON - 1 publicatie
- Cazino Regional: 900 RON - 10 publicatii
- Cazino National: 2.500 RON - 50 publicatii

REGULI DE RECOMANDARE (urmeaza strict aceasta logica):
1. Daca clientul vrea TEST IEFTIN / buget mic / o singura aparitie -> Local 150 RON
2. Daca clientul vrea acoperire DOAR INTR-O REGIUNE / cateva judete -> Regional 500 RON (precizezi regiunea potrivita)
3. Daca clientul vrea acoperire MARE (national / multi-judet / vizibilitate maxima) -> National 50 (1500 RON) - DEFAULT
4. Daca clientul publica RECURENT (lunar, mai multe articole) -> abonament Gold 4500 RON/luna (deal optim) sau Silver 2400 daca buget mai mic
5. Daca clientul e iGaming/cazino/pariuri -> Pachet Cazino corespunzator (NU oferi pachete standard pentru iGaming)
6. Daca firma e LOCALA intr-un singur oras dar vrea credibilitate maxima -> Local 150 RON (test) sau Regional 500 RON (vizibilitate mai mare)

REGULI DE RASPUNS:
- SCURT - maxim 4-5 propozitii
- RECOMANDA mereu un pachet SPECIFIC cu pret
- NU fi vag ("depinde, sunt mai multe optiuni") - DECIDE ferm
- NU da sfaturi generice despre PR sau marketing
- Daca intrebarea NU e despre MediaExpres (ex: "ce e SEO?", "recomanzi Facebook ads?"), redirectioneaza politicos: "Sunt consultantul retelei MediaExpres si va pot ajuta cu alegerea pachetului de distributie. Aveti o intrebare despre pachete sau acoperire?"
- NU inventa fapte noi (cifre trafic exacte, procente, DR Ahrefs, nume publicatii). Foloseste DOAR informatia din context.
- La final, daca ai recomandat un pachet, sugereaza CTA-ul: "Daca pachetul vi se potriveste, dati click pe 'DA, vreau acest pachet' sau 'Continua spre comanda' de pe pagina."
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
