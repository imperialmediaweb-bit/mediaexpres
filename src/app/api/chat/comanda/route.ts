import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions, publicationReports } from "@/db/schema";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { cleanArticleText, cleanTitle } from "@/lib/clean-text";
import { TITLU_DE_PROPUS } from "@/lib/content-policy";

export const runtime = "nodejs";

/**
 * Clientul care REVINE in chat: dovada platii, articolul, starea comenzii.
 *
 * Pana acum toate astea treceau prin WhatsApp-ul proprietarului, care le
 * punea cu mana pe comanda. Aici chatul face acelasi lucru: gaseste comanda
 * dupa emailul cu care s-a facut, pune dovada sau articolul pe ea si
 * anunta proprietarul. Nu creeaza nimic pentru cine doar intreaba —
 * comenzi apar in admin doar cand omul chiar comanda sau trimite ceva.
 *
 * Identificarea e pe email, ca pe WhatsApp e pe numar: cine stie emailul
 * poate vedea starea si atasa fisiere la comanda aceea. Nu poate vedea
 * textul articolului, datele de facturare sau linkurile, si orice atasare
 * e verificata de proprietar inainte sa se intample ceva.
 */

const fileSchema = z.object({ url: z.string().url().max(500), name: z.string().max(200) });

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("find"), email: z.string().email().max(200) }),
  z.object({
    action: z.literal("proof"),
    email: z.string().email().max(200),
    orderId: z.string().min(8).max(64),
    proof: fileSchema,
  }),
  z.object({
    action: z.literal("article"),
    email: z.string().email().max(200),
    orderId: z.string().min(8).max(64),
    title: z.string().max(300).optional().default(""),
    body: z.string().min(40).max(30000),
    images: z.array(fileSchema).max(3).default([]),
    /** true = rescris unic pe fiecare ziar (implicit); false = identic peste tot. */
    uniquePerSite: z.boolean().default(true),
  }),
]);

/** Analiza dovezii, facuta de model pe poza; sta in JSON-ul dovezii. */
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

const ARTICOL_DE_REDACTAT = /^\[De redactat\]|^\(fără titlu/i;

function adminUrl(id: string) {
  return `${SITE.url}/admin/materiale/${id}`;
}

async function findOrders(email: string) {
  const rows = await db
    .select({
      id: orderSubmissions.id,
      packageId: orderSubmissions.packageId,
      createdAt: orderSubmissions.createdAt,
      paymentMethod: orderSubmissions.paymentMethod,
      status: orderSubmissions.status,
      publishedAt: orderSubmissions.publishedAt,
      paymentProof: orderSubmissions.paymentProof,
      title: orderSubmissions.title,
      isCasino: orderSubmissions.isCasino,
    })
    .from(orderSubmissions)
    .where(eq(orderSubmissions.email, email))
    .orderBy(desc(orderSubmissions.createdAt))
    .limit(10);

  const reports = rows.length
    ? await db
        .select({ links: publicationReports.links, articleTitle: publicationReports.articleTitle })
        .from(publicationReports)
        .where(eq(publicationReports.email, email))
    : [];
  const linksByTitle = new Map<string, number>();
  for (const r of reports) {
    let n = 0;
    try {
      n = (JSON.parse(r.links) as unknown[]).length;
    } catch {
      n = 0;
    }
    linksByTitle.set((r.articleTitle || "").trim().toLowerCase(), n);
  }

  return rows.map((r) => {
    const pkg = findPackageById(r.packageId);
    return {
      id: r.id,
      packageName: pkg?.name || "Articol în 50 de ziare",
      price: pkg ? (r.isCasino && pkg.id === "promo-50" ? 1000 : pkg.price) : 500,
      createdAt: r.createdAt.toISOString(),
      paymentMethod: r.paymentMethod === "card" ? "card" : "op",
      status: r.status,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      hasProof: !!r.paymentProof,
      hasArticle: !ARTICOL_DE_REDACTAT.test(r.title) && r.title !== TITLU_DE_PROPUS,
      reportLinks: linksByTitle.get(r.title.trim().toLowerCase()) ?? 0,
    };
  });
}

/**
 * Citeste dovada cu modelul (poza) si o compara cu ce asteptam: suma
 * pachetului si beneficiarul nostru. Nu decide nimic — pune pe comanda ce a
 * vazut, ca proprietarul sa confirme dintr-o privire, nu deschizand poza.
 * Fara cheie sau la PDF, spune „necitit" si merge mai departe.
 */
async function analyzeProof(url: string, expectedAmount: number): Promise<ProofAnalysis> {
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

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  }
  const d = parsed.data;
  const email = d.email.trim().toLowerCase();

  try {
    if (d.action === "find") {
      return NextResponse.json({ ok: true, orders: await findOrders(email) });
    }

    // Comanda trebuie sa fie a emailului dat si sa nu fie deja publicata.
    const [row] = await db
      .select({
        id: orderSubmissions.id,
        packageId: orderSubmissions.packageId,
        isCasino: orderSubmissions.isCasino,
        status: orderSubmissions.status,
        publishedAt: orderSubmissions.publishedAt,
        companyName: orderSubmissions.companyName,
        contactPhone: orderSubmissions.contactPhone,
        title: orderSubmissions.title,
        images: orderSubmissions.images,
      })
      .from(orderSubmissions)
      .where(and(eq(orderSubmissions.id, d.orderId), eq(orderSubmissions.email, email)))
      .limit(1);
    if (!row) {
      return NextResponse.json({ ok: false, error: "Nu găsesc comanda asta pe emailul dat." }, { status: 404 });
    }
    if (row.publishedAt) {
      return NextResponse.json(
        { ok: false, error: "Comanda asta e deja publicată. Pentru modificări scrie-ne pe WhatsApp." },
        { status: 409 },
      );
    }
    const pkg = findPackageById(row.packageId);
    const price = pkg ? (row.isCasino && pkg.id === "promo-50" ? 1000 : pkg.price) : 500;

    if (d.action === "proof") {
      const analiza = await analyzeProof(d.proof.url, price);
      await db
        .update(orderSubmissions)
        .set({ paymentProof: JSON.stringify({ url: d.proof.url, name: d.proof.name, analiza }) })
        .where(eq(orderSubmissions.id, row.id));

      const semn = analiza.potrivire === "da" ? "✅" : analiza.potrivire === "partial" ? "⚠️" : analiza.potrivire === "nu" ? "❌" : "❔";
      await sendEmail({
        to: ADMIN_EMAIL,
        replyTo: email,
        subject: `${semn} Dovadă de plată pe chat — ${row.companyName || email} (${price} lei)`,
        html: wrapEmail(
          "Dovadă de plată primită în chat",
          `
          <p>Clientul a trimis dovada plății din chat. Ce am citit pe ea:</p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
            ${kv("Potrivire", analiza.potrivire === "da" ? "DA — suma și beneficiarul corespund" : analiza.potrivire === "partial" ? "PARȚIAL — verifică" : analiza.potrivire === "nu" ? "NU pare o dovadă de plată" : "necitită automat")}
            ${kv("Sumă pe dovadă", analiza.suma || "—")}
            ${kv("Sumă așteptată", `${price} lei`)}
            ${kv("Data", analiza.data || "—")}
            ${kv("Beneficiar", analiza.beneficiar || "—")}
            ${kv("IBAN", analiza.iban || "—")}
            ${kv("Plătitor", analiza.platitor || "—")}
            ${kv("Observații", analiza.observatii)}
            ${kv("Firmă", row.companyName)}
            ${kv("Email", email)}
            ${kv("Telefon", row.contactPhone)}
          </table>
          <p><a href="${esc(d.proof.url)}">Deschide dovada</a> · <a href="${adminUrl(row.id)}">Deschide comanda în admin</a></p>
          <p style="color:#b91c1c;"><strong>Confirmă încasarea în extras înainte să publici</strong> — analiza de mai sus e o citire a pozei, nu o verificare bancară.</p>
          `,
        ),
      }).catch((e) => console.error("[chat/comanda] email dovada:", e));

      return NextResponse.json({ ok: true, analiza });
    }

    // action === "article"
    let images: unknown[] = [];
    try {
      images = JSON.parse(row.images) as unknown[];
    } catch {
      images = [];
    }
    const merged = [...images, ...d.images].slice(0, 3);
    const title = cleanTitle(d.title.trim() || TITLU_DE_PROPUS);
    const text = cleanArticleText(d.body);
    await db
      .update(orderSubmissions)
      .set({
        title,
        body: text,
        images: JSON.stringify(merged),
        uniquePerSite: d.uniquePerSite,
        generatedByAi: false,
      })
      .where(eq(orderSubmissions.id, row.id));

    await sendEmail({
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: `📝 Articol trimis pe chat — ${row.companyName || email}`,
      html: wrapEmail(
        "Articolul a venit din chat",
        `
        <p>Clientul a trimis articolul pentru comanda lui, din chat. E salvat pe comandă.</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
          ${kv("Firmă", row.companyName)}
          ${kv("Email", email)}
          ${kv("Titlu", title)}
          ${kv("Lungime", `${text.length} caractere`)}
          ${kv("Poze", `${merged.length}`)}
          ${kv("Variantă", d.uniquePerSite ? "rescris unic pe fiecare ziar" : "IDENTIC peste tot (cerut de client)")}
        </table>
        <p><a href="${adminUrl(row.id)}">Deschide comanda în admin</a></p>
        `,
      ),
    }).catch((e) => console.error("[chat/comanda] email articol:", e));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[chat/comanda]", e);
    return NextResponse.json(
      { ok: false, error: "Nu am putut salva acum. Încearcă din nou sau scrie-ne pe WhatsApp." },
      { status: 500 },
    );
  }
}
