import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions, users } from "@/db/schema";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL, bankTransferEmailBox } from "@/lib/email";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";
import { issueInvoiceForOrder } from "@/lib/invoicing";
import { CONTENT_DECLARATION_ERROR, screenContent } from "@/lib/content-policy";
import { cleanArticleText, cleanTitle } from "@/lib/clean-text";

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
  // Bifa obligatorie, nu optionala cu default: intrebarea are rost doar daca
  // raspunsul e explicit. z.literal(true) refuza si `false`, si lipsa campului.
  contentDeclaration: z.literal(true, {
    errorMap: () => ({ message: CONTENT_DECLARATION_ERROR }),
  }),
  isCasino: z.boolean().default(false),
});

/**
 * Comanda prin transfer bancar (OP) — plasata INAINTE de plata.
 *
 * La card, Stripe confirma incasarea automat. La OP, ordinea e cea fireasca
 * intre firme: clientul trimite comanda (materiale + date de facturare),
 * primeste automat factura pe email si plateste pe baza ei. Comanda sta in
 * "pending_payment" pana cand adminul vede banii in extras si confirma —
 * gardul din PATCH /api/admin/materiale/[id] refuza publicarea inainte.
 * Dovada platii e optionala, doar ca accelerator de confirmare.
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
  // Curatam la intrare, o singura data, si tot lantul de dupa — email, admin,
  // copiere, publicare — vede text de om, nu gunoi de PDF.
  d.title = cleanTitle(d.title);
  d.body = cleanArticleText(d.body);

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

  // Trierea NU opreste comanda. A fost, o vreme, o oprire: factura astepta
  // pana citea cineva articolul. Dar omul care a apasat "trimite" si primeste
  // "revenim in maximum o zi" nu asteapta — pleaca, si pierdem o vanzare buna
  // pentru un articol care in 9 cazuri din 10 era in regula.
  //
  // Aparearea reala e in alta parte: clientul bifeaza declaratia INAINTE de
  // plata, iar Termenii spun ca la declaratie falsa banii nu se restituie. Deci
  // riscul nu mai e financiar. Trierea ramane ca sa nu publicam din greseala —
  // e o alerta catre noi, inainte de publicare, nu o piedica pentru client.
  const screening = screenContent(d.title, d.body);

  await sendEmail({
    to: ADMIN_EMAIL,
    replyTo: email,
    subject: `🏦 Comandă prin OP — ${d.companyName} (${pkg.price} lei)`,
    html: wrapEmail(
      "Comandă nouă prin transfer bancar",
      `
      ${screening.flagged ? '<p style="background:#fef2f2;border:2px solid #b91c1c;border-radius:8px;padding:12px;color:#b91c1c;"><strong>⚠️ CITEȘTE ARTICOLUL ÎNAINTE SĂ PUBLICI.</strong> Textul conține termeni din zona interzisă — vezi alerta separată. Comanda merge normal, factura a plecat; verificarea o faci înainte de publicare, nu înainte de încasare. Dacă nu se poate publica, banii NU se restituie (art. 4 din Termeni, declarat de client la comandă).</p>' : ""}
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
        <li style="margin:6px 0;"><strong>Publicăm în maximum 24 de ore lucrătoare</strong> de la încasare și primești raportul cu toate cele 50 de linkuri.</li>
      </ol>
      ${d.paymentProof ? '<p>Dovada plății pe care ai atașat-o ne ajută să confirmăm mai repede — mulțumim.</p>' : ""}
      ${bankTransferEmailBox(`${pkg.price} lei`, `${esc(pkg.name)} — ${esc(d.companyName)}`)}
      <p style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:12px;font-size:13px;color:#78350f;"><strong>De reținut:</strong> la comandă ai declarat că articolul nu prezintă tratamente sau metode de vindecare pentru boli și nu conține alt conținut interzis. Dacă la verificare se dovedește altfel, comanda se anulează, articolul nu se publică <strong>și suma plătită nu se restituie</strong> (art. 4 din <a href="${SITE.url}/legal/termeni">Termeni și condiții</a>). Dacă ai un dubiu, întreabă-ne ÎNAINTE să plătești — răspundem repede.</p>
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
  if (screening.flagged) {
    await sendEmail({
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: `⚠️ CITEȘTE ÎNAINTE SĂ PUBLICI — ${d.companyName}`,
      html: wrapEmail(
        "Articol de citit înainte de publicare",
        `
        <p style="color:#b91c1c;"><strong>Comanda a mers normal — factura a plecat, clientul poate plăti.</strong> Alerta asta e doar pentru tine: textul conține termeni din zona interzisă și trebuie citit <strong>înainte de publicare</strong>.</p>
        <p>Nu e o urgență financiară. Clientul a bifat la comandă declarația că articolul nu prezintă tratamente sau conținut interzis, iar art. 4 din Termeni spune că, dacă declarația e falsă, <strong>banii nu se restituie</strong>. Deci dacă nu se poate publica, nu ai de returnat nimic — doar de anunțat clientul.</p>
        ${kv("Motiv", screening.reason || "conținut interzis")}
        ${kv("Termeni găsiți", screening.hits.join(", "))}
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          ${kv("Client", esc(d.companyName))}
          ${kv("Email", esc(email))}
          ${kv("Telefon", esc(d.contactPhone))}
          ${kv("Sumă", `${pkg.price} RON`)}
          ${kv("Referință", esc(reference))}
        </table>
        <h3 style="margin:20px 0 8px;font-family:Georgia,serif;color:#111111;">${esc(d.title)}</h3>
        <div style="white-space:pre-wrap;border-left:3px solid #e5e5e5;padding-left:16px;margin:12px 0;color:#334155;">${esc(d.body.slice(0, 4000))}${d.body.length > 4000 ? "…" : ""}</div>
        <p><strong>E în regulă?</strong> Publică normal, după ce vezi încasarea.<br/>
        <strong>Nu e?</strong> Scrie-i clientului că nu îl putem publica și de ce. Banii rămân la noi — a declarat altceva decât a trimis.</p>
        <p style="margin-top:16px;"><a href="${SITE.url}/admin/materiale">Vezi comanda în admin →</a></p>
        `,
      ),
    }).catch((e) => console.error("[comanda/transfer] alerta continut:", e));
  }

  void issueInvoiceForOrder({
    email,
    customerName: d.companyName,
    cui: d.companyCui,
    address: d.companyAddress,
    phone: d.contactPhone,
    amount: pkg.price,
    packageLabel: pkg.name,
    orderReference: reference,
    markPaid: false,
    mentions: `Plata prin transfer bancar (OP). Ref: ${reference}`,
  }).catch((e) => console.error("[comanda/transfer] factura automata:", e));

  return NextResponse.json({ ok: true });
}
