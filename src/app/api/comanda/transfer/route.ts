import { NextRequest, NextResponse } from "next/server";
import { eticheteazaAlegerea } from "@/lib/zona-pachet";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { orderSubmissions, users } from "@/db/schema";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";
import { pornestePlataOp } from "@/lib/comanda-op";
import { lookupCui } from "@/lib/anaf";
import { CONTENT_DECLARATION_ERROR, screenContent, TITLU_DE_PROPUS, ARTICOL_DUPA_PLATA } from "@/lib/content-policy";
import { cleanArticleText, cleanTitle } from "@/lib/clean-text";
import { sursaDinCerere, etichetaSursa } from "@/lib/sursa";
import { RITM_IDS, etichetaRitm } from "@/lib/ritm";

export const runtime = "nodejs";

const fileSchema = z.object({ url: z.string().url().max(500), name: z.string().max(200) });

const schema = z.object({
  packageId: z.string().min(1).max(64),
  // Mesajele in romana: primul mesaj de eroare ajunge in caseta rosie a
  // clientului. Implicit, Zod raspundea in engleza („String must contain at
  // least 9 character(s)") — formularul valideaza si el, dar plasa de
  // siguranta trebuie sa vorbeasca aceeasi limba.
  email: z.string().email("Adresa de email nu e validă.").max(200),
  contactPhone: z.string().min(9, "Scrie numărul de telefon.").max(40),
  companyName: z.string().min(2, "Scrie denumirea firmei.").max(200),
  companyCui: z.string().min(2, "Scrie CUI-ul firmei.").max(40),
  companyAddress: z.string().min(5, "Scrie adresa de facturare.").max(300),
  // Titlul lipseste cand clientul ne cere sa scriem noi articolul.
  title: z.string().max(300).optional().default(""),
  // Minimul de 100 de caractere se verifica mai jos, doar cand articolul vine
  // acum — la „Îl trimit după plată” corpul e gol.
  body: z.string().max(30000).default(""),
  /** 17.10.2026 — clientul trimite articolul abia dupa plata. */
  articolDupa: z.boolean().default(false),
  /**
   * 17.10.2026 — „op" = comanda direct prin transfer (pagina veche);
   * „later" = formularul nou, unde metoda de plata se alege DUPA trimitere,
   * pe /comanda/plata/[ref]. La „later" nu pleaca nici factura, nici emailul
   * cu contul: omul poate alege cardul.
   */
  plata: z.enum(["op", "later"]).default("op"),
  siteUrl: z.string().max(300).optional(),
  // Ce cuvinte se leaga si incotro — vezi comentariul din formular.
  linkNotes: z.string().max(1000).optional(),
  images: z.array(fileSchema).max(3).default([]),
  featuredIndex: z.number().int().min(0).max(2).default(0),
  // Optionala prin decizie de flux, nu din comoditate: cerinta obligatorie il
  // punea pe client sa fi platit INAINTE sa fi primit vreo factura — iar o
  // firma nu vireaza bani fara document. Incasarea o vedem in extras oricum;
  // dovada ramane un accelerator pentru cine o are deja.
  paymentProof: fileSchema.optional(),
  facebookOptIn: z.boolean().default(true),
  uniquePerSite: z.boolean().default(true),
  /** Ritmul de publicare ales: rapid / zile3 / sapt2 (lib/ritm.ts). */
  ritm: z.enum(RITM_IDS).default("rapid"),
  // Bifa obligatorie, nu optionala cu default: intrebarea are rost doar daca
  // raspunsul e explicit. z.literal(true) refuza si `false`, si lipsa campului.
  contentDeclaration: z.literal(true, {
    errorMap: () => ({ message: CONTENT_DECLARATION_ERROR }),
  }),
  isCasino: z.boolean().default(false),
  // Ziarul din lista pe care promovam postarea 3 zile; gol = alegem noi.
  fbBoostPaper: z.string().max(120).optional(),
  // 08.10.2026 — zona (Regional) sau ziarul (Local), lib/zona-pachet.ts.
  alegere: z.string().max(80).optional(),
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
  if (d.articolDupa) {
    d.body = ARTICOL_DUPA_PLATA;
  } else if (d.body.trim().length < 100) {
    return NextResponse.json(
      { ok: false, error: "Articolul trebuie să aibă minimum 100 de caractere." },
      { status: 400 },
    );
  }
  const alegerea = eticheteazaAlegerea(d.packageId, d.alegere);
  if (!alegerea.ok) return NextResponse.json({ ok: false, error: alegerea.eroare }, { status: 400 });
  // Curatam la intrare, o singura data, si tot lantul de dupa — email, admin,
  // copiere, publicare — vede text de om, nu gunoi de PDF.
  d.title = cleanTitle(d.title.trim() || TITLU_DE_PROPUS);
  if (!d.articolDupa) d.body = cleanArticleText(d.body);

  // 17.10.2026 — pe comanda (si apoi pe factura) merg numele si adresa
  // OFICIALE de la ANAF. CUI inexistent = oprim aici, cu mesaj; ANAF picat =
  // lasam ce a scris clientul, factura automata il verifica oricum din nou.
  const anaf = await lookupCui(d.companyCui);
  if (anaf.status === "invalid" || anaf.status === "not_found") {
    return NextResponse.json(
      { ok: false, error: "Nu am găsit firma la ANAF după acest CUI. Verifică-l și încearcă din nou." },
      { status: 400 },
    );
  }
  if (anaf.status === "found") {
    d.companyCui = anaf.company.cui;
    d.companyName = anaf.company.name;
    if (anaf.company.address) d.companyAddress = anaf.company.address;
  }

  const pkg = findPackageById(d.packageId);
  if (!pkg) {
    return NextResponse.json({ ok: false, error: "Pachet inexistent" }, { status: 400 });
  }
  const email = d.email.toLowerCase();

  // Identificator propriu, in acelasi camp unic ca la Stripe — o comanda OP nu
  // se poate trimite de doua ori din aceeasi pagina.
  const laPlata = d.plata === "later";
  const reference = `${laPlata ? "cmd" : "op"}_${crypto.randomUUID()}`;
  const sursa = sursaDinCerere(req);

  try {
    await ensureOrderColumns();
    await db.insert(orderSubmissions).values({
      stripeSessionId: reference,
      source: sursa,
      fbBoostPaper: d.fbBoostPaper?.trim() || null,
      linkNotes: d.linkNotes?.trim() || null,
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
      ritm: d.ritm,
      isCasino: d.isCasino,
      paymentMethod: laPlata ? "nedecis" : "op",
      ziareAlese: alegerea.eticheta,
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
    subject: laPlata
      ? `📝 Comandă nouă, încă neplătită — ${d.companyName} (${pkg.price} lei)`
      : `🏦 Comandă prin OP — ${d.companyName} (${pkg.price} lei)`,
    html: wrapEmail(
      laPlata ? "Comandă nouă — alege acum cum plătește" : "Comandă nouă prin transfer bancar",
      `
      ${laPlata ? `<p style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:12px;color:#1e3a8a;">Clientul a completat formularul și e pe pagina de plată (card / OP / WhatsApp). <strong>Încă n-a plătit și nu s-a emis nicio factură.</strong> Dacă nu plătește în câteva ore, merită un telefon: ${esc(d.contactPhone)}.</p>` : ""}
      ${d.articolDupa ? '<p style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;"><strong>Articolul vine după plată</strong> — clientul l-a lăsat pentru mai târziu.</p>' : ""}
      ${screening.flagged ? '<p style="background:#fef2f2;border:2px solid #b91c1c;border-radius:8px;padding:12px;color:#b91c1c;"><strong>⚠️ CITEȘTE ARTICOLUL ÎNAINTE SĂ PUBLICI.</strong> Textul conține termeni din zona interzisă — vezi alerta separată. Comanda merge normal, factura a plecat; verificarea o faci înainte de publicare, nu înainte de încasare. Dacă nu se poate publica, banii NU se restituie (art. 4 din Termeni, declarat de client la comandă).</p>' : ""}
      ${laPlata ? "" : '<p>Factura se emite automat în StartCo pe datele de mai jos (verificate la ANAF). Dacă nu reușește, primești un email separat „Factura de emis manual”. Publici abia după ce vezi încasarea în extras și confirmi plata în admin.</p>'}
      <h3 style="margin:20px 0 8px;font-family:Georgia,serif;color:#111111;">Date pentru factură${anaf.status === "found" ? " (verificate la ANAF)" : " — ANAF n-a răspuns, sunt cele scrise de client"}</h3>
      <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
        ${kv("Denumire", d.companyName)}
        ${kv("CUI", d.companyCui)}
        ${kv("Adresă", d.companyAddress)}
        ${kv("Promovare Facebook (3 zile)", d.fbBoostPaper?.trim() || "alegem noi — ziarul din județul clientului")}
        ${kv("Email", email)}
        ${kv("Sumă", `${pkg.price} RON`)}
        ${kv("Serviciu", `${pkg.name}`)}
      </table>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${kv("Telefon", d.contactPhone)}
        ${kv("Categorie", d.isCasino ? "⚠️ CAZINO / iGaming" : "Standard")}
        ${kv("Publicare", d.uniquePerSite ? "variantă unică pe fiecare ziar" : "IDENTIC pe toate")}
        ${kv("Ritm ales de client", etichetaRitm(d.ritm))}
        ${kv("Dovada plății", d.paymentProof ? "atașată de client (vezi mai jos)" : "neatașată — normal, plătește după ce primește factura")}
        ${kv("De unde a venit", etichetaSursa(sursa))}
      </table>
      ${d.paymentProof ? `<p><strong>Dovada plății:</strong> <a href="${esc(d.paymentProof.url)}">${esc(d.paymentProof.name)}</a></p>` : ""}
      <h3 style="margin:20px 0 8px;font-family:Georgia,serif;color:#111111;">${esc(d.title)}</h3>
      <div style="white-space:pre-wrap;border-left:3px solid #e5e5e5;padding-left:16px;margin:12px 0;color:#334155;">${esc(d.body.slice(0, 1500))}${d.body.length > 1500 ? "…" : ""}</div>
      ${d.linkNotes?.trim() ? `<p style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;"><strong>Linkuri cerute de client:</strong><br/><span style="white-space:pre-wrap;">${esc(d.linkNotes.trim())}</span></p>` : ""}
      <p><strong>Poze:</strong> ${d.images.length}/3</p>
      <p style="margin-top:16px;"><a href="${SITE.url}/admin/materiale">Vezi materialele în admin →</a></p>
      `,
    ),
  });

  if (laPlata) {
    sendEmail({
      to: email,
      subject: "Comanda ta e salvată — alege cum plătești",
      html: wrapEmail(
        "Comanda ta e salvată",
        `
      <p>Bună ziua,</p>
      <p>Am salvat comanda pentru <strong>${esc(pkg.name)}</strong> — ${pkg.price} lei, pe firma <strong>${esc(d.companyName)}</strong>.</p>
      <p>Dacă n-ai apucat să plătești, o poți face oricând de aici — cu cardul sau prin ordin de plată:</p>
      <p style="margin:16px 0;"><a href="${SITE.url}/comanda/plata/${reference}" style="background:#E4002B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Alege cum plătești →</a></p>
      <p>Factura fiscală o primești automat pe email: la card imediat după plată, la OP imediat ce alegi transferul bancar.</p>
      <p>Întrebări? Răspunde la acest email sau scrie-ne pe WhatsApp la <strong>${SITE.phone}</strong>.</p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `,
      ),
    }).catch((e) => console.error("[comanda/transfer] mail client:", e));
  }

  // Factura (la OP) pleaca la final, prin pornestePlataOp — vezi lib/comanda-op.ts.
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

  if (!laPlata) {
    await pornestePlataOp({
      email,
      companyName: d.companyName,
      cui: d.companyCui,
      address: d.companyAddress,
      phone: d.contactPhone,
      pkgName: pkg.name,
      price: pkg.price,
      reference,
      hasProof: Boolean(d.paymentProof),
    });
  }

  return NextResponse.json({ ok: true, ref: reference });
}
