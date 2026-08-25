import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions, users } from "@/db/schema";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

const fileSchema = z.object({ url: z.string().url().max(500), name: z.string().max(200) });

const schema = z.object({
  packageId: z.string().min(1).max(64),
  email: z.string().email().max(200),
  contactPhone: z.string().min(9).max(40),
  companyName: z.string().min(2).max(200),
  companyCui: z.string().min(2).max(40),
  companyAddress: z.string().min(5).max(300),
  title: z.string().min(5).max(300),
  body: z.string().min(100).max(30000),
  siteUrl: z.string().max(300).optional(),
  images: z.array(fileSchema).max(3).default([]),
  featuredIndex: z.number().int().min(0).max(2).default(0),
  paymentProof: fileSchema,
  facebookOptIn: z.boolean().default(true),
  uniquePerSite: z.boolean().default(true),
  isCasino: z.boolean().default(false),
});

/**
 * Comanda platita prin transfer bancar (OP).
 *
 * La plata cu cardul, Stripe confirma incasarea si abia apoi clientul ajunge la
 * formularul de materiale. La OP nu exista o astfel de confirmare automata:
 * clientul incarca dovada platii odata cu articolul, iar comanda ramane in
 * asteptare pana cand verificam extrasul. De aceea status-ul e distinct
 * ("pending_payment") — sa nu ajunga din greseala la publicare neplatita.
 */
export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const pkg = findPackageById(d.packageId);
  if (!pkg) {
    return NextResponse.json({ ok: false, error: "Pachet inexistent" }, { status: 400 });
  }
  const email = d.email.toLowerCase();

  // Identificator propriu, in acelasi camp unic ca la Stripe — o comanda OP nu
  // se poate trimite de doua ori din aceeasi pagina.
  const reference = `op_${crypto.randomUUID()}`;

  try {
    await db.insert(orderSubmissions).values({
      stripeSessionId: reference,
      email,
      packageId: d.packageId,
      title: d.title,
      body: d.body,
      companyName: d.companyName,
      companyCui: d.companyCui,
      companyAddress: d.companyAddress,
      siteUrl: d.siteUrl || null,
      contactPhone: d.contactPhone,
      images: JSON.stringify(d.images),
      featuredIndex: d.featuredIndex,
      facebookOptIn: d.facebookOptIn,
      uniquePerSite: d.uniquePerSite,
      isCasino: d.isCasino,
      paymentMethod: "op",
      paymentProof: JSON.stringify(d.paymentProof),
      status: "pending_payment",
    });

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!existing) {
      await db.insert(users).values({
        email,
        name: d.companyName,
        phone: d.contactPhone,
        companyName: d.companyName,
        companyCui: d.companyCui,
        companyAddress: d.companyAddress,
      });
    }
  } catch (err) {
    console.error("[comanda/transfer] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Nu am putut salva comanda. Încearcă din nou." },
      { status: 500 },
    );
  }

  await sendEmail({
    to: ADMIN_EMAIL,
    replyTo: email,
    subject: `🏦 Comandă prin OP — ${d.companyName} (${pkg.price} lei)`,
    html: wrapEmail(
      "Comandă nouă prin transfer bancar",
      `
      <p style="color:#b91c1c;"><strong>Verifică extrasul înainte de publicare.</strong> Clientul a încărcat dovada plății, dar încasarea nu e confirmată automat.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${kv("Pachet", `${pkg.name} — ${pkg.price} RON`)}
        ${kv("Firmă", d.companyName)}
        ${kv("CUI", d.companyCui)}
        ${kv("Adresă", d.companyAddress)}
        ${kv("Email", email)}
        ${kv("Telefon", d.contactPhone)}
        ${kv("Categorie", d.isCasino ? "⚠️ CAZINO / iGaming" : "Standard")}
        ${kv("Publicare", d.uniquePerSite ? "variantă unică pe fiecare ziar" : "IDENTIC pe toate")}
      </table>
      <p><strong>Dovada plății:</strong> <a href="${esc(d.paymentProof.url)}">${esc(d.paymentProof.name)}</a></p>
      <h3 style="margin:20px 0 8px;font-family:Georgia,serif;color:#111111;">${esc(d.title)}</h3>
      <div style="white-space:pre-wrap;border-left:3px solid #e5e5e5;padding-left:16px;margin:12px 0;color:#334155;">${esc(d.body.slice(0, 1500))}${d.body.length > 1500 ? "…" : ""}</div>
      <p><strong>Poze:</strong> ${d.images.length}/3</p>
      <p style="margin-top:16px;"><a href="${SITE.url}/admin/materiale">Vezi materialele în admin →</a></p>
      `,
    ),
  });

  sendEmail({
    to: email,
    subject: "Am primit comanda ta — MediaExpres",
    html: wrapEmail(
      "Comandă primită",
      `
      <p>Salut,</p>
      <p>Am primit materialele și dovada plății pentru <strong>${esc(pkg.name)}</strong> (${pkg.price} lei).</p>
      <p>Verificăm încasarea în extrasul bancar — de obicei durează câteva ore lucrătoare, în funcție de bancă. Imediat după confirmare publicăm articolul, în maximum 4 ore lucrătoare, și primești pe email raportul cu toate linkurile și factura fiscală.</p>
      <p>Dacă între timp ai întrebări, răspunde la acest email sau scrie-ne pe WhatsApp la <strong>${SITE.phone}</strong>.</p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `,
    ),
  }).catch((e) => console.error("[comanda/transfer] mail client:", e));

  return NextResponse.json({ ok: true });
}
