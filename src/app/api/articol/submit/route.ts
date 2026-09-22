import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOrderToken } from "@/lib/order-token";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { findPackageById } from "@/data/packages";
import { db } from "@/db";
import { getStripe } from "@/lib/stripe";
import { ensureOrderColumns } from "@/lib/ensure-columns";
import { orderSubmissions, orders, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SITE } from "@/data/site";
import { CONTENT_DECLARATION_ERROR, POZE_OBLIGATORII } from "@/lib/content-policy";
import { cleanArticleText, cleanTitle } from "@/lib/clean-text";
import { sursaDinCerere, etichetaSursa } from "@/lib/sursa";
import { RITM_IDS, etichetaRitm } from "@/lib/ritm";
import { campaniaPentruComanda } from "@/lib/retea";

export const runtime = "nodejs";

const imageSchema = z.object({
  url: z.string().url().max(500),
  publicId: z.string().max(300).optional(),
});

const schema = z.object({
  token: z.string().min(10),
  title: z.string().min(5).max(300),
  body: z.string().min(100).max(30000),
  companyName: z.string().max(200).optional(),
  siteUrl: z.string().max(300).optional(),
  contactPhone: z.string().max(40).optional(),
  // 21.09.2026 — CUI si adresa au trecut de pe pagina de plata aici.
  cui: z.string().max(40).optional(),
  billingAddress: z.string().max(300).optional(),
  // 22.09.2026 — clientul a incercat sa urce pozele si i-au picat in browser.
  // Formularul ii deschide atunci portita, la a doua apasare; steagul asta
  // ii spune serverului ca nu e cineva care a sarit peste pasul de poze.
  pozeEsuate: z.boolean().optional(),
  fbBoostPaper: z.string().max(120).optional(),
  /** „ancoră → adresă", o linie pe link. Vezi schema, link_notes. */
  linkNotes: z.string().max(1000).optional(),
  metaDescription: z.string().max(400).optional(),
  keywords: z.array(z.string().max(80)).max(20).optional(),
  images: z.array(imageSchema).max(3).default([]),
  featuredIndex: z.number().int().min(0).max(2).default(0),
  facebookOptIn: z.boolean().default(true),
  uniquePerSite: z.boolean().default(true),
  /** Ritmul de publicare ales: rapid / zile3 / sapt2 (lib/ritm.ts). */
  ritm: z.enum(RITM_IDS).default("rapid"),
  // Bifa obligatorie, nu optionala cu default: intrebarea are rost doar daca
  // raspunsul e explicit. z.literal(true) refuza si `false`, si lipsa campului.
  contentDeclaration: z.literal(true, {
    errorMap: () => ({ message: CONTENT_DECLARATION_ERROR }),
  }),
  generatedByAi: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 },
    );
  }
  const d = parsed.data;
  // Aceeasi curatare ca la comanda prin OP — vezi lib/clean-text.ts.
  d.title = cleanTitle(d.title);
  d.body = cleanArticleText(d.body);

  // Pozele, verificate PE SERVER, nu doar in formular.
  //
  // 13.09.2026 — a patra comanda sosita „Imagini (0/3)", la cateva minute
  // dupa ce formularul incepuse sa ceara 3 poze. Motivul: paginile deschise
  // INAINTE de deploy ruleaza mai departe codul vechi din browser. Un client
  // care are formularul deschis de o ora nu afla niciodata de regula noua.
  // Deci regula sta aici, unde ajunge orice trimitere, oricat de veche e
  // pagina. Verificarea e inaintea oricarei scrieri: nimic nu se pierde,
  // clientul adauga pozele si trimite din nou.
  // 22.09.2026 — exceptia: clientul a INCERCAT si incarcarea i-a picat in
  // browser. Un om care a platit nu are voie sa ramana captiv intre banii
  // dati si un formular care nu-l lasa sa trimita. Comanda intra fara poze,
  // marcata ca atare, iar pozele vin pe WhatsApp.
  if (d.images.length < POZE_OBLIGATORII && !d.pozeEsuate) {
    return NextResponse.json(
      {
        ok: false,
        error:
          d.images.length === 0
            ? `Articolul nu poate fi trimis fără poze. Urcă ${POZE_OBLIGATORII} poze cu firma ta (logo, sediu, produse, echipă) la pasul „Poze" și apasă din nou Trimite. Dacă poza nu se încarcă de pe telefon, trimite-o pe WhatsApp la ${SITE.phone} și o punem noi — textul tău e păstrat.`
            : `Mai urcă ${POZE_OBLIGATORII - d.images.length} ${POZE_OBLIGATORII - d.images.length === 1 ? "poză" : "poze"} (ai ${d.images.length}, sunt necesare ${POZE_OBLIGATORII}) și apasă din nou Trimite.`,
      },
      { status: 400 },
    );
  }

  const order = verifyOrderToken(d.token);
  if (!order) {
    return NextResponse.json(
      { ok: false, error: "Link expirat sau invalid. Scrie-ne pe contact@mediaexpress.ro." },
      { status: 403 },
    );
  }

  const pkg = findPackageById(order.packageId);
  const isCasino = order.packageId.includes("cazino");

  // De unde a venit clientul: se ia de pe PLATA, nu din cererea asta.
  //
  // 13.09.2026 — in emailul comenzii scria „Link de pe checkout.stripe.com",
  // adica exact nimic: omul ajunge aici intors de la Stripe, deci referrerul
  // de acum e Stripe, iar cookie-ul de sursa poate lipsi (alt browser, alt
  // telefon, link din email). Sursa adevarata a fost prinsa la checkout si
  // dusa prin metadata sesiunii pana in `orders.source` (webhook). De acolo
  // o citim. Cererea curenta ramane doar plasa, cand plata nu se gaseste.
  let sursa = sursaDinCerere(req);
  try {
    const [plata] = await db
      .select({ source: orders.source })
      .from(orders)
      .where(eq(orders.stripeSessionId, order.sessionId))
      .limit(1);
    if (plata?.source) sursa = plata.source;
  } catch (err) {
    console.error("[articol/submit] nu am putut citi sursa platii:", err);
  }

  // featuredIndex vine din UI, dar poate depasi numarul real de poze.
  const featured = d.images[d.featuredIndex] ?? d.images[0];

  // SALVAREA E PRIMA, inainte de orice email. Un articol platit care a trait
  // doar intr-un email catre o adresa cu bounce a fost de negasit in admin —
  // nu se mai intampla. Daca DB-ul pica, mergem totusi mai departe pe email
  // (best-effort dublu), dar niciodata invers.
  // O plata = o singura trimitere. Insertul e si garda: indexul unic pe
  // stripeSessionId respinge a doua trimitere pe aceeasi comanda.
  let alreadySubmitted = false;
  try {
    await ensureOrderColumns();
    const inserted = await db
      .insert(orderSubmissions)
      .values({
        stripeSessionId: order.sessionId,
        source: sursa,
        fbBoostPaper: d.fbBoostPaper?.trim() || null,
        linkNotes: d.linkNotes?.trim() || null,
        email: order.email,
        packageId: order.packageId,
        title: d.title,
        body: d.body,
        metaDescription: d.metaDescription || null,
        keywords: d.keywords?.length ? d.keywords.join(", ") : null,
        companyName: d.companyName || null,
        siteUrl: d.siteUrl || null,
        contactPhone: d.contactPhone || null,
        cui: d.cui || null,
        billingAddress: d.billingAddress || null,
        images: JSON.stringify(d.images),
        featuredIndex: d.featuredIndex,
        facebookOptIn: d.facebookOptIn,
        uniquePerSite: d.uniquePerSite,
        ritm: d.ritm,
        generatedByAi: d.generatedByAi,
        isCasino,
      })
      .onConflictDoNothing({ target: orderSubmissions.stripeSessionId })
      .returning({ id: orderSubmissions.id });
    alreadySubmitted = inserted.length === 0;
  } catch (err) {
    console.error("[articol/submit] NU am putut salva in DB (continui pe email):", err);
  }

  /**
   * 21.09.2026 — datele de firma ajung si pe profilul clientului.
   *
   * Pana acum veneau din `custom_fields` de pe pagina Stripe. Alea au fost
   * scoase (cereau de doua ori acelasi lucru si costau plati), deci singura
   * lor sursa e formularul asta. Completam DOAR ce lipseste: ce a scris omul
   * in contul lui ramane al lui.
   *
   * Tacut si neblocant — un profil neactualizat nu are voie sa strice o
   * comanda deja platita si trimisa.
   */
  try {
    const patch: Record<string, string> = {};
    if (d.companyName?.trim()) patch.companyName = d.companyName.trim();
    if (d.cui?.trim()) patch.companyCui = d.cui.trim();
    if (d.billingAddress?.trim()) patch.companyAddress = d.billingAddress.trim();
    if (d.contactPhone?.trim()) patch.phone = d.contactPhone.trim();
    if (Object.keys(patch).length) {
      const [profil] = await db
        .select({
          id: users.id,
          companyName: users.companyName,
          companyCui: users.companyCui,
          companyAddress: users.companyAddress,
          phone: users.phone,
        })
        .from(users)
        .where(eq(users.email, order.email))
        .limit(1);
      if (profil) {
        const doarGoale: Record<string, string> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (!profil[k as keyof typeof profil]) doarGoale[k] = v;
        }
        if (Object.keys(doarGoale).length) {
          await db.update(users).set(doarGoale).where(eq(users.id, profil.id));
        }
      }
    }
  } catch (err) {
    console.error("[articol/submit] profilul nu a putut fi completat:", err);
  }

  /**
   * 21.09.2026 — numele firmei si CUI-ul se scriu INAPOI pe tranzactia din
   * Stripe.
   *
   * Pana acum veneau din `custom_fields` de pe pagina de plata, iar contabila
   * identifica dupa ele fiecare incasare. Campurile alea au fost scoase (opt
   * lucruri cerute pentru 500 de lei, 40 din 45 de oameni se opreau acolo),
   * dar nevoia ei a ramas: fara CUI pe tranzactie nu poate lega incasarea de
   * firma si trebuie sa i le trimita proprietarul de mana.
   *
   * Deci nu le mai CEREM inainte de plata, le SCRIEM dupa: la doua minute,
   * cand clientul completeaza formularul, punem numele firmei si CUI-ul in
   * descrierea platii si in metadata ei. In lista de plati din Stripe apar
   * exact ca inainte.
   *
   * Tacut si neblocant: comanda e deja platita si salvata, o eroare de
   * scriere in Stripe nu are voie sa o atinga.
   */
  try {
    const firma = d.companyName?.trim() || "";
    const codFiscal = d.cui?.trim() || "";
    if (firma || codFiscal) {
      const [randComanda] = await db
        .select({ pi: orders.stripePaymentIntentId })
        .from(orders)
        .where(eq(orders.stripeSessionId, order.sessionId))
        .limit(1);
      const stripe = getStripe();
      if (stripe && randComanda?.pi) {
        await stripe.paymentIntents.update(randComanda.pi, {
          description: [firma, codFiscal ? `CUI ${codFiscal}` : ""]
            .filter(Boolean)
            .join(" · "),
          metadata: {
            ...(firma ? { company_name: firma } : {}),
            ...(codFiscal ? { company_cui: codFiscal } : {}),
            ...(d.billingAddress?.trim() ? { company_address: d.billingAddress.trim() } : {}),
          },
        });
      }
    }
  } catch (err) {
    console.error("[articol/submit] nu am putut scrie firma pe plata Stripe:", err);
  }

  if (alreadySubmitted) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Ai trimis deja materialele pentru această comandă. Dacă vrei să le modifici, răspunde la emailul de confirmare sau scrie-ne pe WhatsApp la " +
          SITE.phone +
          ".",
      },
      { status: 409 },
    );
  }

  const imagesHtml = d.images.length
    ? d.images
        .map(
          (img, i) =>
            `<p style="margin:4px 0;"><a href="${esc(img.url)}">${esc(img.url)}</a>${
              i === d.featuredIndex ? ' <strong style="color:#C8102E;">← REPREZENTATIVĂ</strong>' : ""
            }</p>`,
        )
        .join("")
    : d.pozeEsuate
      // Nu e „a sarit peste poze": i-au PICAT. Scris rosu, ca sa stii ca
      // trebuie sa i le ceri pe WhatsApp inainte de publicare — fara poza
      // principala, articolul nu ajunge niciodata pe Facebook.
      ? '<p style="color:#C8102E;font-weight:700;">⚠️ ÎNCĂRCAREA POZELOR I-A EȘUAT — cere-i pozele pe WhatsApp înainte de publicare.</p>'
      : '<p style="color:#94a3b8;">Nicio poză încărcată.</p>';

  const adminHtml = wrapEmail(
    isCasino ? "⚠️ Articol nou — CAZINO" : "Articol nou de publicat",
    `
    <p style="margin:0 0 12px;color:#64748b;">Client care a plătit deja. Materialele sunt gata de publicare.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${kv("Pachet", pkg ? `${pkg.name} — ${pkg.price} RON` : order.packageId)}
      ${kv("Categorie", isCasino ? "⚠️ CAZINO / iGaming" : "Standard")}
      ${kv("Email client", order.email)}
      ${kv("Telefon", d.contactPhone || "—")}
      ${kv("CUI", d.cui || "—")}
      ${kv("Adresa facturare", d.billingAddress || "—")}
      ${kv("Firmă", d.companyName || "—")}
      ${kv("Promovare Facebook (3 zile)", d.fbBoostPaper?.trim() || "alegem noi — ziarul din județul clientului")}
      ${kv("Site", d.siteUrl || "—")}
      ${kv("Publicare", d.uniquePerSite ? "Variantă unică pe fiecare ziar" : "⚠️ IDENTIC pe toate — clientul a cerut textul neschimbat")}
      ${kv("Ritm ales de client", etichetaRitm(d.ritm))}
      ${kv("Distribuire Facebook", d.facebookOptIn ? "✅ Da" : "❌ Nu (clientul a refuzat)")}
      ${kv("Scris cu AI", d.generatedByAi ? "Da" : "Nu — text propriu")}
      ${kv("De unde a venit", etichetaSursa(sursa))}
      ${kv("Referință comandă", order.sessionId)}
    </table>

    ${d.linkNotes?.trim() ? `<p style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;"><strong>Linkuri cerute de client (ancoră → adresă):</strong><br/><span style="white-space:pre-wrap;">${esc(d.linkNotes.trim())}</span></p>` : `<p style="color:#94a3b8;">Clientul nu a scris pe ce cuvinte vrea linkul — ancora implicită e numele firmei către site.</p>`}
    <h3 style="margin:24px 0 8px;font-family:Georgia,serif;color:#0B1F3A;">${esc(d.title)}</h3>
    ${d.metaDescription ? `<p style="color:#64748b;font-size:13px;"><strong>Meta:</strong> ${esc(d.metaDescription)}</p>` : ""}
    ${d.keywords?.length ? `<p style="color:#64748b;font-size:13px;"><strong>Cuvinte-cheie:</strong> ${esc(d.keywords.join(", "))}</p>` : ""}
    <div style="white-space:pre-wrap;border-left:3px solid #e2e8f0;padding-left:16px;margin:16px 0;color:#334155;">${esc(d.body)}</div>

    <h4 style="margin:24px 0 8px;color:#0B1F3A;">Imagini (${d.images.length}/3)</h4>
    ${imagesHtml}
    `,
  );

  const adminResult = await sendEmail({
    to: ADMIN_EMAIL,
    subject: isCasino
      ? `⚠️ [CAZINO] Articol de publicat — ${d.companyName || order.email}`
      : `📄 Articol de publicat — ${d.companyName || order.email}`,
    html: adminHtml,
    replyTo: order.email,
  });

  if (!adminResult.ok) {
    return NextResponse.json(
      { ok: false, error: "Nu am putut trimite materialele. Încearcă din nou." },
      { status: 500 },
    );
  }

  // 16.09.2026 — linkul paginii publice a campaniei, cand exista deja una in
  // retea. Clientul care a ales ritmul de doua saptamani nu mai asteapta doua
  // saptamani fara nicio dovada: deschide pagina si vede cum se completeaza.
  // Daca reteaua tace, emailul pleaca exact ca inainte.
  let linkRaport: string | null = null;
  try {
    const r = await campaniaPentruComanda(order.sessionId, order.email);
    if (r.stare === "gasita") linkRaport = r.campanie.raportUrl;
  } catch (err) {
    console.error("[articol/submit] nu am putut citi campania din retea:", err);
  }

  // Confirmarea catre client nu trebuie sa blocheze raspunsul — materialele au ajuns deja.
  sendEmail({
    to: order.email,
    subject: "Materialele au ajuns — publicăm în 12 ore lucrătoare",
    html: wrapEmail(
      "Am primit articolul tău",
      `
      <p>Salut,</p>
      <p>Am primit articolul <strong>„${esc(d.title)}"</strong>${
        d.images.length
          ? ` și ${d.images.length === 1 ? "imaginea atașată" : `cele ${d.images.length} imagini`}`
          : ""
      }.</p>
      <p>Îl publicăm ${
        pkg?.newspapers
          ? pkg.newspapers === 1
            ? "pe publicația din pachetul tău"
            : `pe cele ${pkg.newspapers}${pkg.newspapers >= 20 ? " de" : ""} publicații din pachetul tău`
          : "în publicațiile din pachetul tău"
      } în maximum <strong>12 ore lucrătoare</strong>. Când e gata, primești pe email raportul cu toate linkurile.</p>
      ${
        linkRaport
          ? `<p style="margin:20px 0;"><a href="${esc(linkRaport)}" style="display:inline-block;background:#c1121f;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:8px;">Urmărește publicările</a></p>
             <p style="color:#64748b;font-size:13px;">Pagina se completează pe măsură ce apar articolele. La final primiți raportul complet, cu toate linkurile.</p>`
          : ""
      }
      ${featured ? `<p style="margin:16px 0;"><img src="${esc(featured.url)}" alt="" style="max-width:100%;border-radius:8px;" /></p>` : ""}
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `,
    ),
  }).catch((err) => console.error("[articol/submit] client email error:", err));

  return NextResponse.json({ ok: true });
}
