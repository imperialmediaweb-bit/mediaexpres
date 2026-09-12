import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { buildAdvisorKnowledge } from "@/lib/advisor-knowledge";
import { SITE } from "@/data/site";

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
- SEO, linkuri, Domain Authority, indexare, Google, trafic, Facebook, „e ok pentru SEO?”, „ma ajuta in Google?” — SUNT intrebari despre produsul nostru, deci raspunzi. Dar raspunsul e cinstit: NU vindem SEO si nu promitem pozitii sau trafic. Vindem aparitii in presa care raman permanent, cu linkuri permanente catre site-ul clientului (sunt dofollow, poti confirma). Foloseste blocurile SUNT ZIARE ADEVARATE si CE VINDEM, DE FAPT. Nu promite niciodata pozitii in Google, cresterea autoritatii sau „backlinkuri de calitate care urca site-ul”.
- Un singur cuvant sau o intrebare scurta („seo", „pret", „cluj", „factura", „cazino") e un SUBIECT, nu o intrebare straina: raspunde despre acel subiect din cunostinte.
- Doar cand intrebarea chiar nu are legatura cu noi (reteta de cozonac, cum isi face site, sfaturi de marketing in general), spui O DATA, scurt: „Aici te pot ajuta cu publicarea in cele 50 de ziare — pret, unde apare, cum comanzi." si oferi un exemplu de intrebare utila. NU repeta niciodata acelasi raspuns de doua ori la rand; daca omul insista, raspunde altfel sau trimite-l pe WhatsApp la ${SITE.phone}.
- NU inventa fapte noi (cifre trafic exacte, procente, DR Ahrefs, nume publicatii). Foloseste DOAR informatia din context.
- COMANDA SE POATE FACE CHIAR IN ACEASTA CONVERSATIE. Sub casuta de scris exista butonul rosu "Comanda acum". Cand omul e decis, sau intreaba cum plateste / cum comanda, trimite-l ACOLO: "Apasati butonul rosu 'Comanda acum' de mai jos si va iau pas cu pas." NU il trimite pe alta pagina ca sa comande — pierde drumul.
- In chat se poate plati si cu cardul, si prin transfer bancar (OP). La OP, tot in chat se dau datele de facturare, articolul si pozele — NU trebuie sa fi platit ca sa comande: primeste factura pe email in aceeasi zi lucratoare (o emitem noi) si plateste pe baza ei. Dovada platii e optionala. Spune asta cand cineva intreaba de OP.
- Limba romana cu diacritice corecte
- Tonul: profesional, prietenos, decisiv
- Foloseste "agentul nostru va ajuta cu redactarea" NU "AI scrie"

- VORBESTE CA PROPRIETARUL: direct, cald, sigur pe el, fara limbaj de corporatie. Raspunzi la intrebare, dai cifra sau conditia exacta, si SPUI ce ai face tu in locul lui.
- DUPA CE RASPUNZI, INCHIDE: o singura propozitie care duce spre pasul urmator, potrivita cu momentul. Daca omul se intereseaza: „Poti comanda direct aici, cu butonul rosu de mai jos." Daca a comandat deja: spune-i ca poate trimite dovada / articolul / intreba de comanda tot aici. Nu repeta aceeasi inchidere de doua ori la rand.
- OFERA ALEGEREA rescris/original cand vine vorba de articol, cu recomandarea din cunostinte.

ETICHETA DE ACTIUNE (obligatoriu, pe ULTIMA linie, singura pe linie): dupa raspuns pui EXACT una dintre:
[[ACTIUNE:comanda]] — omul vrea sa comande / intreaba cum plateste / e decis
[[ACTIUNE:dovada]] — a platit deja si vrea sa trimita dovada / intreaba unde o trimite
[[ACTIUNE:articol]] — are comanda si vrea sa trimita articolul sau pozele acum
[[ACTIUNE:stare]] — intreaba ce e cu comanda lui, cand se publica, unde e raportul
[[ACTIUNE:niciuna]] — orice altceva
Eticheta NU se afiseaza clientului; interfata pune butonul potrivit sub raspuns.

Raspunde direct cu textul plain - FARA JSON, FARA markdown, FARA bullet points cu asteriscuri.`;

/** Etichetele pe care le poate pune modelul; orice altceva = niciuna. */
const ACTIUNI = new Set(["comanda", "dovada", "articol", "stare"]);

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

    // Consultantul vorbeste cu oameni care sunt pe punctul sa plateasca 500 de
    // lei. Merita modelul bun, nu cel mai ieftin: raspunsurile gresite despre
    // pret sau despre ce contine pachetul se platesc in comenzi pierdute.
    //
    // Claude e prima alegere. OpenAI ramane ca plasa: daca ANTHROPIC_API_KEY nu
    // e pus pe server, chatul merge mai departe pe calea veche, neschimbata.
    // Asa, trecerea nu poate opri consultantul de pe un site care vinde.
    const cheieClaude = process.env.ANTHROPIC_API_KEY;
    const key = process.env.OPENAI_API_KEY;
    if (!cheieClaude && !key) {
      console.error("[advisor] lipsesc si ANTHROPIC_API_KEY si OPENAI_API_KEY");
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

    const ultimele = messages.slice(-10);
    let raw: string | undefined;

    if (cheieClaude) {
      const client = new Anthropic({ apiKey: cheieClaude });
      try {
        const raspuns = await client.messages.create({
          model: process.env.ANTHROPIC_MODEL || "claude-opus-5",
          // Peste vechiul 480: la Claude, gandirea consuma din acelasi buget,
          // iar un raspuns taiat in doua e mai rau decat unul lung. Lungimea
          // reala o tine promptul, care cere raspunsuri scurte.
          max_tokens: 2000,
          // Efort mic: e o discutie de vanzari, nu o problema grea, iar omul
          // asteapta raspunsul pe ecran. Mai mult efort ar insemna doar mai
          // multa asteptare.
          output_config: { effort: "low" },
          system: systemPrompt,
          messages: ultimele.map((m) => ({ role: m.role, content: m.content })),
        });

        // Un refuz vine cu 200 si continut gol. Fara verificare, vizitatorul ar
        // vedea o bula goala si ar pleca de pe pagina.
        if (raspuns.stop_reason === "refusal") {
          return NextResponse.json({
            ok: true,
            answer:
              "La intrebarea asta prefer sa raspunda un om. Scrie-ne la contact@mediaexpress.ro sau pe WhatsApp si iti raspundem repede.",
            action: null,
          });
        }

        raw = raspuns.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
      } catch (e) {
        console.error("[advisor] Anthropic error:", e instanceof Error ? e.message : e);
        raw = undefined;
      }
    }

    // Calea veche: fie n-avem cheie Claude, fie apelul a cazut. Un consultant
    // care tace pe o pagina de vanzare costa mai mult decat un model mai slab.
    if (!raw && key) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL_FAST || "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }, ...ultimele],
          max_tokens: 480,
          temperature: 0.4,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("[advisor] OpenAI error:", res.status, errText);
      } else {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        raw = data?.choices?.[0]?.message?.content?.trim();
      }
    }

    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "Consultantul nu poate raspunde acum. Scrie-ne la contact@mediaexpress.ro." },
        { status: 500 }
      );
    }

    // Safety: scoatem mentiuni "AI scrie/AI redacteaza" daca scapa
    // Eticheta de actiune: o scoatem din text si o dam interfetei separat.
    // Daca modelul o uita sau o scrie gresit, raspunsul ramane valid, fara buton.
    let action: string | null = null;
    const answer = raw
      .replace(/\s*\[\[\s*ACTIUNE\s*:\s*([a-z]+)\s*\]\]\s*/gi, (_m, a: string) => {
        const key = a.toLowerCase();
        if (ACTIUNI.has(key)) action = key;
        return " ";
      })
      .replace(/\bAI[­\s-]+(scrie|redacteaza|genereaza|creeaza)\b/gi, "agentul nostru va ajuta sa $1")
      .replace(/\bAI-ul (nostru )?\b/gi, "agentul nostru ")
      .replace(/\binteligen[țt]a artificiala\b/gi, "agentul nostru")
      .trim();

    return NextResponse.json({ ok: true, answer, action });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Eroare server";
    console.error("[advisor] crash:", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
