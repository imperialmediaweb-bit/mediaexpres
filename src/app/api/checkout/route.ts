import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { findPackageById, SUBSCRIPTION_PLANS } from "@/data/packages";
import { SITE } from "@/data/site";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  packageId: z.string().min(1).max(64),
  mode: z
    .enum(["package", "subscription-standard", "subscription-casino"])
    .default("package"),
  email: z.string().email().optional(),
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
  const { packageId, mode, email } = parsed.data;

  const session = await auth();
  const userId = session?.user?.id;
  const sessionEmail = session?.user?.email || email;

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
        },
        client_reference_id: userId || undefined,
        billing_address_collection: "required",
        tax_id_collection: { enabled: true },
        phone_number_collection: { enabled: true },
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
          {
            key: "company_reg_no",
            label: { type: "custom", custom: "Nr. reg. comert (optional)" },
            type: "text",
            optional: true,
          },
        ],
        success_url: `${SITE.url}/comanda/multumim?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE.url}/comanda/anulat`,
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
  const sub = SUBSCRIPTION_PLANS.find((s) => s.id === packageId);
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
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      phone_number_collection: { enabled: true },
      success_url: `${SITE.url}/comanda/multumim?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/comanda/anulat`,
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
