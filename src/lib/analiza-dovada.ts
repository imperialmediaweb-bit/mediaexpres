import { SITE } from "@/data/site";

export interface ProofAnalysis {
  suma: string | null;
  data: string | null;
  beneficiar: string | null;
  iban: string | null;
  platitor: string | null;
  /** "da" = suma si beneficiarul se potrivesc; "partial" = ceva difera; "nu" = nu e o plata. */
  potrivire: "da" | "partial" | "nu" | "necitit";
  observatii: string;
}

/**
 * Citeste dovada cu modelul (poza) si o compara cu ce asteptam: suma
 * pachetului si beneficiarul nostru. Nu decide nimic — pune pe comanda ce a
 * vazut, ca proprietarul sa confirme dintr-o privire, nu deschizand poza.
 * Fara cheie sau la PDF, spune „necitit" si merge mai departe.
 */
export async function analyzeProof(url: string, expectedAmount: number): Promise<ProofAnalysis> {
  const necitit: ProofAnalysis = {
    suma: null, data: null, beneficiar: null, iban: null, platitor: null,
    potrivire: "necitit", observatii: "Nu am putut citi dovada automat — verifică poza.",
  };
  const key = process.env.OPENAI_API_KEY;
  if (!key) return necitit;
  if (/\.pdf($|\?)/i.test(url)) return { ...necitit, observatii: "Dovada e PDF — deschide-o și verifică manual." };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL_FAST || "gpt-4o-mini",
        temperature: 0,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `Citesti o dovada de plata (captura din aplicatia bancii sau ordin de plata) si extragi datele. ` +
              `Asteptam un transfer de ${expectedAmount} RON catre "${SITE.billing.company}", IBAN ${SITE.billing.iban}. ` +
              `Raspunzi DOAR cu JSON: {"suma": "500 RON" | null, "data": "2026-09-02" | null, "beneficiar": string | null, ` +
              `"iban": string | null, "platitor": string | null, "potrivire": "da" | "partial" | "nu", "observatii": string}. ` +
              `"da" = suma si beneficiarul (sau IBAN-ul) se potrivesc si transferul pare efectuat, nu programat/in asteptare; ` +
              `"partial" = ceva difera (suma, beneficiar, sau plata e doar initiata); "nu" = nu e o dovada de plata. ` +
              `In "observatii" scrii in romana, o propozitie, ce ar trebui sa verifice omul.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Dovada:" },
              { type: "image_url", image_url: { url, detail: "low" } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return necitit;
    const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = JSON.parse(j.choices?.[0]?.message?.content || "{}") as Partial<ProofAnalysis>;
    const potrivire = (["da", "partial", "nu"] as const).find((v) => v === parsed.potrivire) ?? "necitit";
    return {
      suma: parsed.suma ?? null,
      data: parsed.data ?? null,
      beneficiar: parsed.beneficiar ?? null,
      iban: parsed.iban ?? null,
      platitor: parsed.platitor ?? null,
      potrivire,
      observatii: String(parsed.observatii || "").slice(0, 300),
    };
  } catch (e) {
    console.error("[chat/comanda] analiza dovezii:", e);
    return necitit;
  }
}
