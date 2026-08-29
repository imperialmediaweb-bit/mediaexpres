import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions, users } from "@/db/schema";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL, bankTransferEmailBox } from "@/lib/email";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";
import { issueInvoiceForOrder } from "@/lib/invoicing";

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
  // Optionala prin decizie de flux, nu din comoditate: cerinta obligatorie il
  // punea pe client sa fi platit INAINTE sa fi primit vreo factura — iar o
  // firma nu vireaza bani fara document. Incasarea o vedem in extras oricum;
  // dovada ramane un accelerator pentru cine o are deja.
  paymentProof: fileSchema.optional(),
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
      paymentProof: d.paymentProof ? JSON.stringify(d.paymentProof) : null,
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
      <p style="color:#b91c1c;"><strong>Factura se emite automat în StartCo și pleacă la client</strong> — dacă emiterea eșuează primești o alertă separată și o faci manual pe datele de mai jos. Publici abia după ce vezi încasarea în extras și confirmi plata în admin.</p>
      <h3 style="margin:20px 0 8px;font-family:Georgia,serif;color:#111111;">Date pentru factură — de copiat în StartCo</h3>
      <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
        ${kv("Denumire", d.companyName)}
        ${kv("CUI", d.companyCui)}
        ${kv("Adresă", d.companyAddress)}
        ${kv("Email", email)}
        ${kv("Sumă", `${pkg.price} RON`)}
        ${kv("Serviciu", `${pkg.name}`)}
      </table>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${kv("Telefon", d.contactPhone)}
        ${kv("Categorie", d.isCasino ? "⚠️ CAZINO / iGaming" : "Standard")}
        ${kv("Publicare", d.uniquePerSite ? "variantă unică pe fiecare ziar" : "IDENTIC pe toate")}
        ${kv("Dovada plății", d.paymentProof ? "atașată de client (vezi mai jos)" : "neatașată — normal, plătește după ce primește factura")}
      </table>
      ${d.paymentProof ? `<p><strong>Dovada plății:</strong> <a href="${esc(d.paymentProof.url)}">${esc(d.paymentProof.name)}</a></p>` : ""}
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
      <p>Am primit comanda și materialele pentru <strong>${esc(pkg.name)}</strong> — ${pkg.price} lei.</p>
      <p><strong>Ce urmează, în ordine:</strong></p>
      <ol style="padding-left:20px;margin:8px 0 16px;">
        <li style="margin:6px 0;"><strong>Îți trimitem factura fiscală</strong> pe acest email, în scurt timp.</li>
        <li style="margin:6px 0;"><strong>Plătești prin transfer bancar</strong> — datele contului sunt mai jos, ca să le ai la îndemână.</li>
        <li style="margin:6px 0;"><strong>Publicăm în maximum 4 ore lucrătoare</strong> de la încasare și primești raportul cu toate cele 50 de linkuri.</li>
      </ol>
      ${d.paymentProof ? '<p>Dovada plății pe care ai atașat-o ne ajută să confirmăm mai repede — mulțumim.</p>' : ""}
      ${bankTransferEmailBox(`${pkg.price} lei`, `${esc(pkg.name)} — ${esc(d.companyName)}`)}
      <p>Dacă între timp ai întrebări, răspunde la acest email sau scrie-ne pe WhatsApp la <strong>${SITE.phone}</strong>.</p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `,
    ),
  }).catch((e) => console.error("[comanda/transfer] mail client:", e));

  // Factura pleaca AUTOMAT, neincasata (markPaid: false): clientul nu poate
  // plati fara document, iar fiecare ora de asteptare pana la factura e o
  // sansa sa se razgandeasca. Best-effort prin design — issueInvoiceForOrder
  // isi inghite propriile erori si alerteaza adminul; comanda e deja salvata,
  // raspunsul catre client nu asteapta si nu depinde de StartCo.
  // Acopera si formularul, si comanda din chat: amandoua trec pe aici.
  void issueInvoiceForOrder({
    email,
    customerName: d.companyName,
    cui: d.companyCui,
    address: d.companyAddress,
    phone: d.contactPhone,
    amount: pkg.price,
    packageLabel: pkg.name,
    stripeSessionId: reference,
    markPaid: false,
    mentions: `Plata prin transfer bancar (OP). Ref: ${reference}`,
  }).catch((e) => console.error("[comanda/transfer] factura automata:", e));

  return NextResponse.json({ ok: true });
}
