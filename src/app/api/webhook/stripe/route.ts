import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { sendEmail, wrapEmail, kv, escapeHtml, ADMIN_EMAIL } from "@/lib/email";
import { issueInvoiceForOrder } from "@/lib/invoicing";
import { db } from "@/db";
import { users, orders, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { findSubscriptionPlanById } from "@/data/packages";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

async function ensureUser(opts: {
  email: string | null | undefined;
  name?: string | null;
  phone?: string | null;
  stripeCustomerId?: string | null;
  billing?: Stripe.Address | null;
  customFields?: Stripe.Checkout.Session.CustomField[] | null;
  userIdHint?: string | null;
}): Promise<string | null> {
  const { email, name, phone, stripeCustomerId, billing, customFields, userIdHint } = opts;

  if (userIdHint) {
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userIdHint))
      .limit(1);
    if (row) {
      await applyBillingUpdate(row.id, { name, phone, stripeCustomerId, billing, customFields });
      return row.id;
    }
  }

  if (!email) return null;

  const [byEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (byEmail) {
    await applyBillingUpdate(byEmail.id, { name, phone, stripeCustomerId, billing, customFields });
    return byEmail.id;
  }

  const id = crypto.randomUUID();
  const company = customFields?.find((f) => f.key === "company_name")?.text?.value || null;
  const cui = customFields?.find((f) => f.key === "company_cui")?.text?.value || null;
  const reg = customFields?.find((f) => f.key === "company_reg_no")?.text?.value || null;
  const addressStr = billing
    ? [billing.line1, billing.line2, billing.postal_code, billing.city, billing.state, billing.country]
        .filter(Boolean)
        .join(", ")
    : null;

  await db.insert(users).values({
    id,
    email,
    name: name || null,
    phone: phone || null,
    companyName: company,
    companyCui: cui,
    companyRegNo: reg,
    companyAddress: addressStr,
    stripeCustomerId: stripeCustomerId || null,
  });
  return id;
}

async function applyBillingUpdate(
  userId: string,
  opts: {
    name?: string | null;
    phone?: string | null;
    stripeCustomerId?: string | null;
    billing?: Stripe.Address | null;
    customFields?: Stripe.Checkout.Session.CustomField[] | null;
  }
) {
  const { name, phone, stripeCustomerId, billing, customFields } = opts;
  const patch: Partial<typeof users.$inferInsert> = {};
  if (name) patch.name = name;
  if (phone) patch.phone = phone;
  if (stripeCustomerId) patch.stripeCustomerId = stripeCustomerId;
  if (billing) {
    const addressStr = [
      billing.line1,
      billing.line2,
      billing.postal_code,
      billing.city,
      billing.state,
      billing.country,
    ]
      .filter(Boolean)
      .join(", ");
    if (addressStr) patch.companyAddress = addressStr;
  }
  if (customFields) {
    const company = customFields.find((f) => f.key === "company_name")?.text?.value;
    const cui = customFields.find((f) => f.key === "company_cui")?.text?.value;
    const reg = customFields.find((f) => f.key === "company_reg_no")?.text?.value;
    if (company) patch.companyName = company;
    if (cui) patch.companyCui = cui;
    if (reg) patch.companyRegNo = reg;
  }
  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, userId));
  }
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Stripe webhook nu este configurat" },
      { status: 503 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ ok: false, error: "Signature missing" }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed", err);
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripe, event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await handleInvoicePaid(stripe, event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.created":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] handler error", event.type, err);
    return NextResponse.json({ ok: false, error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const email = session.customer_details?.email || session.customer_email || null;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id || null;
  const userIdHint =
    (session.metadata?.userId as string | undefined) ||
    session.client_reference_id ||
    null;

  const userId = await ensureUser({
    email,
    name: session.customer_details?.name || null,
    phone: session.customer_details?.phone || null,
    stripeCustomerId,
    billing: session.customer_details?.address || null,
    customFields: session.custom_fields || null,
    userIdHint,
  });

  if (session.mode === "payment") {
    // Stripe livreaza evenimentele cel putin o data si reincearca la timeout.
    // Fara gardul asta, un retry ar duplica comanda, emailurile SI factura fiscala.
    const [already] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.stripeSessionId, session.id))
      .limit(1);
    if (already) {
      console.log("[stripe-webhook] sesiune deja procesata, ignor:", session.id);
      return;
    }

    const packageId = (session.metadata?.packageId as string) || "unknown";
    const amount = session.amount_total || 0;
    const currency = (session.currency || "ron").toLowerCase();
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null;

    // onConflictDoNothing + indexul unic inchid si cursa dintre doua livrari
    // concurente: doar una reuseste insertul, cealalta se opreste aici.
    const inserted = await db
      .insert(orders)
      .values({
        userId: userId || null,
        email: email || "",
        packageId,
        amount,
        currency,
        status: "paid",
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        paidAt: new Date(),
      })
      .onConflictDoNothing({ target: orders.stripeSessionId })
      .returning({ id: orders.id });
    if (inserted.length === 0) {
      console.log("[stripe-webhook] insert concurent pierdut, ignor:", session.id);
      return;
    }

    await sendConfirmationEmails({
      kind: "payment",
      email,
      customerName: session.customer_details?.name || null,
      amount: amount / 100,
      label: packageId,
      sessionId: session.id,
    });

    // Facturarea nu trebuie sa poata darama webhookul — issueInvoiceForOrder
    // isi inghite propriile erori si alerteaza adminul.
    const billing = session.customer_details?.address;
    await issueInvoiceForOrder({
      email,
      customerName: session.customer_details?.name || null,
      // CUI-ul poate veni din campul oficial de tax ID al Stripe sau din custom field.
      cui:
        session.customer_details?.tax_ids?.[0]?.value ||
        session.custom_fields?.find((f) => f.key === "company_cui")?.text?.value ||
        null,
      address: billing
        ? [billing.line1, billing.line2].filter(Boolean).join(", ")
        : null,
      city: billing?.city || null,
      phone: session.customer_details?.phone || null,
      amount: amount / 100,
      packageLabel: packageId,
      stripeSessionId: session.id,
    });

    // Upsell: cine a cumparat oferta o singura data afla ca abonamentul lunar
    // e mai ieftin. Programat la 3 zile — dupa ce si-a vazut articolul publicat.
    if (email && (packageId === "promo-50" || packageId === "promo-50-cazino")) {
      const isCasinoPromo = packageId === "promo-50-cazino";
      const monthlyPrice = isCasinoPromo ? 800 : 400;
      const oncePrice = isCasinoPromo ? 1000 : 500;
      const firstName = escapeHtml((session.customer_details?.name || "").split(" ")[0] || "");
      // await: intr-un runtime serverless, un fire-and-forget poate fi inghetat
      // inainte sa ajunga la Resend — iar erorile sunt deja prinse mai jos.
      await sendEmail({
        to: email,
        subject: `Articolul tău în 50 de ziare, în fiecare lună — ${monthlyPrice} lei/lună`,
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        html: wrapEmail(
          "Ți-a plăcut? Fă-o lunar, mai ieftin.",
          `
          <p>Salut${firstName ? " " + firstName : ""},</p>
          <p>Ai plătit <strong>${oncePrice} lei</strong> pentru articolul tău în cele 50 de ziare. Dacă vrei prezență constantă în presă, avem o variantă mai bună:</p>
          <p style="margin:16px 0;font-size:18px;"><strong>Abonament lunar: ${monthlyPrice} lei/lună</strong> — cu ${oncePrice - monthlyPrice} lei mai puțin decât plata unică.</p>
          <ul style="margin:16px 0;padding-left:20px;color:#334155;">
            <li style="margin:6px 0;">1 articol nou pe cele 50 de ziare, în fiecare lună</li>
            <li style="margin:6px 0;">50 de backlinks noi lunar — SEO-ul crește constant</li>
            <li style="margin:6px 0;">Îți scrii articolul din cont sau îl generezi cu AI</li>
            <li style="margin:6px 0;">Anulezi oricând, fără penalizări</li>
          </ul>
          <p style="margin-top:16px;">
            <a href="${SITE.url}/oferta-500" style="background:#E4002B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Activează abonamentul — ${monthlyPrice} lei/lună</a>
          </p>
          <p style="margin-top:16px;color:#64748b;font-size:13px;">Alege „Abonament lunar" pe pagină și plătești cu cardul, ca data trecută.</p>
          <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
          `,
        ),
      }).catch((err) => console.error("[stripe-webhook] upsell email error:", err));
    }
  }

  if (session.mode === "subscription" && session.subscription) {
    const subId =
      typeof session.subscription === "string" ? session.subscription : session.subscription.id;

    // Retry-urile Stripe nu trebuie sa retrimita emailurile de confirmare:
    // daca abonamentul e deja in DB, evenimentul asta a mai fost procesat.
    const [subAlready] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.id, subId))
      .limit(1);

    const sub = await stripe.subscriptions.retrieve(subId);
    await upsertSubscription(sub, userId);

    if (subAlready) {
      console.log("[stripe-webhook] abonament deja procesat, sar emailurile:", subId);
      return;
    }

    await sendConfirmationEmails({
      kind: "subscription",
      email,
      customerName: session.customer_details?.name || null,
      amount: (session.amount_total || 0) / 100,
      label: (session.metadata?.planId as string) || "abonament",
      sessionId: session.id,
    });
  }
}

/**
 * Cos abandonat: clientul a deschis plata, si-a lasat emailul, dar n-a terminat.
 * Stripe emite checkout.session.expired (la 2h, cf. expires_at din checkout) cu
 * un link de recuperare care redeschide EXACT aceeasi sesiune de plata.
 * Ii trimitem un email prietenos de reamintire cu linkul ala.
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  if (session.mode !== "payment") return;

  const email = session.customer_details?.email || session.customer_email || null;
  // Fara email n-avem cui scrie — clientul a plecat inainte sa-l completeze.
  if (!email) return;

  // Daca intre timp a platit totusi (alta sesiune), nu-l batem la cap.
  const [alreadyPaid] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.email, email))
    .limit(1);
  if (alreadyPaid) {
    console.log("[stripe-webhook] cos abandonat, dar clientul a platit deja:", email);
    return;
  }

  const recoveryUrl = session.after_expiration?.recovery?.url || `${SITE.url}/oferta-500`;
  const packageId = (session.metadata?.packageId as string) || "";
  const isPromo = packageId === "promo-50" || packageId === "promo-50-cazino";
  const amount = (session.amount_total || 0) / 100;
  const firstName = escapeHtml((session.customer_details?.name || "").split(" ")[0] || "");

  await sendEmail({
    to: email,
    subject: isPromo
      ? "Oferta ta te așteaptă — articolul în 50 de ziare 📰"
      : "Comanda ta la MediaExpres te așteaptă",
    html: wrapEmail(
      "Ai fost la un pas 👀",
      `
      <p>Salut${firstName ? " " + firstName : ""},</p>
      <p>Ai început comanda${amount ? ` de <strong>${amount.toFixed(0)} lei</strong>` : ""} pentru publicarea articolului tău${
        isPromo ? " în <strong>cele 50 de ziare</strong> din rețeaua MediaExpres" : ""
      }, dar plata a rămas neterminată.</p>
      ${
        isPromo
          ? `<p>Ca să știi ce lași pe masă: <strong>50 de publicații reale</strong>, 50 de backlinks permanente, distribuire pe 50 de pagini de Facebook și raportul cu toate linkurile — publicat în 24 de ore. La prețul ăsta e cea mai ieftină intrare în presă din România: <strong>10 lei pe ziar</strong>.</p>`
          : ""
      }
      <p>Comanda ta e salvată — o poți relua exact de unde ai rămas, într-un minut:</p>
      <p style="margin-top:16px;">
        <a href="${recoveryUrl}" style="background:#E4002B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Finalizează comanda →</a>
      </p>
      <p style="margin-top:16px;color:#64748b;font-size:13px;">Oferta e limitată pentru clienți noi — nu garantăm că prețul rămâne.</p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `,
    ),
    replyTo: ADMIN_EMAIL,
  }).catch((err) => console.error("[stripe-webhook] recovery email error:", err));
}

async function handleInvoicePaid(stripe: Stripe, invoice: Stripe.Invoice) {
  const subId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subId) return;

  const sub = await stripe.subscriptions.retrieve(subId);
  const planId = (sub.metadata?.planId as string) || "";
  const plan = findSubscriptionPlanById(planId);
  const included = plan?.distributionsPerMonth ?? 0;

  await db
    .update(subscriptions)
    .set({
      articlesRemaining: included,
      articlesIncludedPerMonth: included,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  const [exists] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.id, sub.id))
    .limit(1);
  if (!exists) {
    await upsertSubscription(sub, null);
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  await upsertSubscription(sub, null);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await db
    .update(subscriptions)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id));
}

async function upsertSubscription(sub: Stripe.Subscription, userIdHint: string | null) {
  const planId = (sub.metadata?.planId as string) || "";
  const category = (sub.metadata?.category as string) || "standard";
  const plan = findSubscriptionPlanById(planId);
  const included =
    plan?.distributionsPerMonth ||
    Number(sub.metadata?.articlesIncludedPerMonth || 0);

  let userId = userIdHint || (sub.metadata?.userId as string | undefined) || null;
  const stripeCustomerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  if (!userId) {
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId))
      .limit(1);
    userId = row?.id || null;
  }

  if (!userId) {
    console.warn("[stripe-webhook] subscription without linkable user", sub.id);
    return;
  }

  const [existing] = await db
    .select({ id: subscriptions.id, articlesRemaining: subscriptions.articlesRemaining })
    .from(subscriptions)
    .where(eq(subscriptions.id, sub.id))
    .limit(1);

  if (existing) {
    const patch: Partial<typeof subscriptions.$inferInsert> = {
      status: sub.status,
      category,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      updatedAt: new Date(),
    };
    if (planId) patch.planId = planId;
    if (included) patch.articlesIncludedPerMonth = included;
    await db.update(subscriptions).set(patch).where(eq(subscriptions.id, sub.id));
  } else {
    await db.insert(subscriptions).values({
      id: sub.id,
      userId,
      stripeCustomerId,
      planId: planId || "bronze",
      category,
      status: sub.status,
      articlesIncludedPerMonth: included,
      articlesRemaining: included,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    });
  }
}

async function sendConfirmationEmails(args: {
  kind: "payment" | "subscription";
  email: string | null;
  customerName: string | null;
  amount: number;
  label: string;
  sessionId: string;
}) {
  const { kind, email, customerName, amount, label, sessionId } = args;
  const firstName = (customerName || "").split(" ")[0] || "";

  const adminHtml = wrapEmail(
    kind === "payment" ? "Plata primita — Stripe" : "Abonament nou — Stripe",
    `
    <p>${kind === "payment" ? "O plata" : "Un abonament"} a fost procesat${kind === "payment" ? "a" : ""} cu succes prin Stripe.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${kv(kind === "payment" ? "Pachet" : "Abonament", label)}
      ${kv("Suma", `${amount.toFixed(2)} RON`)}
      ${kv("Email client", email || "—")}
      ${kv("Nume client", customerName || "—")}
      ${kv("Session ID", sessionId)}
    </table>
    <p style="margin-top:16px;color:#64748b;">Detalii complete in dashboardul clientului si in Stripe.</p>
  `
  );

  await sendEmail({
    to: ADMIN_EMAIL,
    subject:
      kind === "payment"
        ? `[Plata Stripe] ${label} — ${amount.toFixed(2)} RON`
        : `[Abonament Stripe] ${label} — ${amount.toFixed(2)} RON`,
    html: adminHtml,
    replyTo: email || undefined,
  });

  if (email) {
    const customerHtml = wrapEmail(
      kind === "payment" ? "Plata confirmata — MediaExpres" : "Abonament activ — MediaExpres",
      `
      <p>Salut${firstName ? " " + firstName : ""},</p>
      <p>Multumim pentru plata! Am primit <strong>${amount.toFixed(2)} RON</strong>${
        kind === "subscription" ? " pentru primul ciclu al abonamentului" : ""
      }.</p>
      <p>Intra in cont pentru a gestiona comanda, a incarca pozele si a genera articolul:</p>
      <p style="margin-top:16px;">
        <a href="${SITE.url}/cont" style="background:#E4002B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Intra in cont</a>
      </p>
      <p style="margin-top:16px;color:#64748b;font-size:13px;">Daca nu ai inca cont, apasa pe "Intra in cont", pune emailul de mai sus si primesti un link magic.</p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
    `
    );
    await sendEmail({
      to: email,
      subject: kind === "payment" ? "Plata confirmata — MediaExpres" : "Abonament activ — MediaExpres",
      html: customerHtml,
    });
  }
}
