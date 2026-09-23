import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { findPackageById, findSubscriptionPlanById } from "@/data/packages";
import { SITE } from "@/data/site";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractRequestUserData } from "@/lib/meta-capi";
import { sursaDinCerere } from "@/lib/sursa";
import { extractGaClientId } from "@/lib/ga-mp";
import {
  ziareDinSluguri,
  pretAlacarte,
  etichetaZiare,
  TOTAL_ZIARE,
} from "@/lib/alacarte";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  packageId: z.string().min(1).max(64),
  mode: z
    .enum(["package", "subscription-standard", "subscription-casino", "alacarte"])
    .default("package"),
  email: z.string().email().optional(),
  // 23.09.2026 — publicatiile bifate pe /alege-ziarele. Lista e doar o
  // CERERE: preturile si numele se iau din rețea pe server (lib/alacarte.ts),
  // niciodata din ce trimite browserul.
  ziare: z.array(z.string().min(1).max(80)).max(120).optional(),
});

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "Stripe nu este configurat" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  }
  const { packageId, mode, email, ziare } = parsed.data;

  // Cookie-urile de atribuire Meta (_fbp si mai ales _fbc, care contine
  // fbclid-ul din linkul reclamei) exista DOAR in browserul clientului.
  // Purchase se trimite insa din webhookul Stripe, care vine de la Stripe —
  // acolo cookie-urile nu mai sunt nicaieri. Fara ele Meta primeste evenimentul
  // si il potriveste pe email, dar nu-l poate lega de reclama care a adus omul,
  // asa ca in Ads Manager coloana Purchases ramane goala desi ai vandut.
  // Le trecem prin metadata sesiunii, singurul loc care supravietuieste drumului.
  const fbAttr = extractRequestUserData(req);
  const sursa = sursaDinCerere(req);
  const gaCid = extractGaClientId(req);
  const fbMeta = {
    ...(fbAttr.fbp ? { fbp: fbAttr.fbp } : {}),
    ...(fbAttr.fbc ? { fbc: fbAttr.fbc } : {}),
    // client_id-ul GA, pe acelasi drum: browserul il are, webhookul nu.
    ...(gaCid ? { gacid: gaCid } : {}),
    // Si sursa vizitei (Google Ads / Facebook / direct), ca sa apara in admin
    // langa comanda. Tot din cookie, tot pe drumul asta.
    ...(sursa ? { sursa } : {}),
  };

  const session = await auth();
  const userId = session?.user?.id;
  const sessionEmail = session?.user?.email || email;

  // Salvam emailul ca lead INAINTE de plata. Stripe il capteaza abia pe pagina
  // lui, deci cine pleaca de acolo mai devreme ramanea complet necunoscut —
  // fara email, recuperarea cosului abandonat nu are cui sa scrie.
  if (email && !userId) {
    try {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (!existing) {
        await db.insert(users).values({ email });
      }
    } catch (err) {
      // Un lead nesalvat nu trebuie sa blocheze o plata.
      console.error("[checkout] nu am putut salva lead-ul:", err);
    }
  }

  // If logged in, try to reuse existing Stripe customer
  let stripeCustomerId: string | undefined;
  if (userId) {
    const [row] = await db
      .select({
        stripeCustomerId: users.stripeCustomerId,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    stripeCustomerId = row?.stripeCustomerId || undefined;
    if (!stripeCustomerId && row?.email) {
      const customer = await stripe.customers.create({
        email: row.email,
        name: row.name || undefined,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      await db
        .update(users)
        .set({ stripeCustomerId: customer.id })
        .where(eq(users.id, userId));
    }
  }

  /**
   * 23.09.2026 — „alege singur ziarele". Clientul bifeaza publicatiile pe
   * /alege-ziarele si plateste exact cat a bifat.
   *
   * Pretul NU vine din browser. Vine din numarul de publicatii VALIDE, dupa
   * ce lista trimisa e trecuta prin retea: altfel oricine putea deschide
   * consola si cumpara 50 de ziare cu 1 leu.
   */
  if (mode === "alacarte") {
    const alese = ziareDinSluguri(ziare || []);
    if (alese.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Alege cel putin o publicatie" },
        { status: 400 }
      );
    }
    const pret = pretAlacarte(alese.length);
    const eticheta = etichetaZiare(alese);
    const numeLista =
      eticheta === "toate"
        ? `toate cele ${TOTAL_ZIARE} de publicatii`
        : alese.map((z) => z.name).join(", ");
    // Pachetul e recunoscut peste tot dupa id; aici id-ul spune si cate sunt,
    // ca sa apara citibil in emailul de plata, pe factura si in admin.
    const idPachet = `alege-${alese.length}-ziare`;
    try {
      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        expires_at: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
        after_expiration: {
          recovery: { enabled: true, allow_promotion_codes: true },
        },
        ...(stripeCustomerId
          ? { customer: stripeCustomerId }
          : sessionEmail
          ? { customer_email: sessionEmail }
          : {}),
        line_items: [
          {
            price_data: {
              currency: "ron",
              unit_amount: pret.total * 100,
              product_data: {
                name: `Articol în ${alese.length} ${
                  alese.length === 1 ? "publicație" : "publicații"
                }`,
                // Stripe taie descrierea lunga, iar numele a 50 de ziare nu
                // incap oricum — la toata reteaua se scrie asa.
                description:
                  numeLista.length > 380
                    ? `${TOTAL_ZIARE} de publicații MediaExpres (rețeaua completă)`
                    : numeLista,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          packageId: idPachet,
          mode,
          category: "standard",
          // Publicatiile alese, pe drumul care supravietuieste pana la
          // webhook: fara ele nu stim unde publicam ce tocmai s-a platit.
          ziare: eticheta,
          ...(userId ? { userId } : {}),
          ...fbMeta,
        },
        client_reference_id: userId || undefined,
        billing_address_collection: "auto",
        custom_fields: [
          {
            key: "company_name",
            label: { type: "custom", custom: "Nume firma (optional)" },
            type: "text",
            optional: true,
          },
          {
            key: "company_cui",
            label: { type: "custom", custom: "CUI (optional)" },
            type: "text",
            optional: true,
          },
        ],
        success_url: `${SITE.url}/comanda/multumim?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE.url}/alege-ziarele?anulat=1`,
        locale: "ro",
        allow_promotion_codes: true,
      });
      return NextResponse.json({ ok: true, url: checkout.url });
    } catch (err) {
      console.error("[checkout] Stripe alacarte error:", err);
      return NextResponse.json(
        { ok: false, error: "Eroare la crearea sesiunii de plata" },
        { status: 500 }
      );
    }
  }

  if (mode === "package") {
    const pkg = findPackageById(packageId);
    if (!pkg) {
      return NextResponse.json(
        { ok: false, error: "Pachet inexistent" },
        { status: 404 }
      );
    }
    const name = `${pkg.name} (${pkg.category === "casino" ? "Cazino" : "Standard"})`;
    try {
      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        // Recuperare cos abandonat: sesiunea expira in 2h, iar Stripe emite
        // checkout.session.expired cu un link care REDESCHIDE exact plata asta.
        // Webhookul trimite atunci emailul de reamintire.
        expires_at: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
        after_expiration: {
          recovery: { enabled: true, allow_promotion_codes: true },
        },
        ...(stripeCustomerId
          ? { customer: stripeCustomerId }
          : sessionEmail
          ? { customer_email: sessionEmail }
          : {}),
        line_items: [
          {
            price_data: {
              currency: "ron",
              unit_amount: pkg.price * 100,
              product_data: {
                name,
                description:
                  "Publicare advertorial / comunicat pe reteaua MediaExpres",
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          packageId,
          mode,
          category: pkg.category,
          ...(userId ? { userId } : {}),
          ...fbMeta,
        },
        client_reference_id: userId || undefined,
        /**
         * 21.09.2026 — pagina de plata cerea OPT lucruri pentru 500 de lei:
         * email, tara si telefon, card, nume, adresa completa obligatorie,
         * cod TVA, nume firma, CUI. Masurat pe 29 de zile: 45 de oameni au
         * ajuns la card, 5 au platit. Patruzeci s-au oprit acolo — adica fix
         * oamenii care deja decisesera.
         *
         * „auto" lasa Stripe sa ceara doar ce-i trebuie cardului (de regula
         * tara si codul postal), nu strada si orasul. Telefonul nu e necesar
         * ca sa incasezi.
         *
         * Datele pentru FACTURA nu se pierd: numele firmei, CUI-ul si adresa
         * se cer in formularul de dupa plata, unde omul e deja client si
         * completeaza oricum ca sa-i apara articolul. Mai putine campuri
         * inainte de bani, aceleasi date dupa.
         *
         * Numele firmei si CUI-ul RAMAN totusi aici, ca doua campuri
         * OPTIONALE (decizia proprietarului, 21.09): contabila identifica
         * dupa ele incasarile din Stripe, si le vrea pe tranzactie din
         * secunda platii, nu peste cateva minute. Doua casute optionale sunt
         * ieftine; adresa obligatorie si telefonul erau greul, alea raman
         * scoase. Cine le sare le completeaza oricum in formularul de dupa
         * plata, de unde se scriu inapoi pe tranzactie.
         *
         * `tax_id_collection` si nr. reg. comert au disparut de tot: firma nu
         * e platitoare de TVA, iar numarul de registru nu-l cere nimeni.
         */
        billing_address_collection: "auto",
        custom_fields: [
          {
            key: "company_name",
            label: { type: "custom", custom: "Nume firma (optional)" },
            type: "text",
            optional: true,
          },
          {
            key: "company_cui",
            label: { type: "custom", custom: "CUI (optional)" },
            type: "text",
            optional: true,
          },
        ],
        success_url: `${SITE.url}/comanda/multumim?session_id={CHECKOUT_SESSION_ID}`,
        // Pachetul merge in linkul de anulare: cine iese din Stripe fara sa
        // plateasca (firma fara card, sef care vrea OP) trebuie sa primeasca
        // pe loc drumul prin ordin de plata pentru ACELASI pachet, nu o
        // pagina generica cu „vezi pachete" la pret intreg.
        cancel_url: `${SITE.url}/comanda/anulat?pachet=${encodeURIComponent(packageId)}`,
        locale: "ro",
        allow_promotion_codes: true,
      });
      return NextResponse.json({ ok: true, url: checkout.url });
    } catch (err) {
      console.error("[checkout] Stripe error:", err);
      return NextResponse.json(
        { ok: false, error: "Eroare la crearea sesiunii de plata" },
        { status: 500 }
      );
    }
  }

  // Subscription
  const sub = findSubscriptionPlanById(packageId);
  if (!sub) {
    return NextResponse.json(
      { ok: false, error: "Abonament inexistent" },
      { status: 404 }
    );
  }
  const isCasino = mode === "subscription-casino";
  const category = isCasino ? "casino" : "standard";
  const amountInBani = (isCasino ? sub.priceCasino : sub.priceStandard) * 100;
  const name = `Abonament ${sub.name} (${isCasino ? "Cazino" : "Standard"})`;

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      ...(stripeCustomerId
        ? { customer: stripeCustomerId }
        : sessionEmail
        ? { customer_email: sessionEmail }
        : {}),
      line_items: [
        {
          price_data: {
            currency: "ron",
            unit_amount: amountInBani,
            recurring: { interval: "month" },
            product_data: {
              name,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        planId: sub.id,
        category,
        mode,
        ...(userId ? { userId } : {}),
        ...fbMeta,
      },
      subscription_data: {
        metadata: {
          planId: sub.id,
          category,
          articlesIncludedPerMonth: String(sub.distributionsPerMonth),
          ...(userId ? { userId } : {}),
        },
      },
      client_reference_id: userId || undefined,
      // Acelasi motiv ca la plata unica (vezi comentariul de mai sus).
      billing_address_collection: "auto",
      success_url: `${SITE.url}/comanda/multumim?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/comanda/anulat?abonament=1`,
      locale: "ro",
      allow_promotion_codes: true,
    });
    return NextResponse.json({ ok: true, url: checkout.url });
  } catch (err) {
    console.error("[checkout] Stripe subscription error:", err);
    return NextResponse.json(
      { ok: false, error: "Eroare la crearea abonamentului" },
      { status: 500 }
    );
  }
}
