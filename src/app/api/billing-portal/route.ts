import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { SITE } from "@/data/site";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ ok: false, error: "Stripe nu este configurat" }, { status: 503 });
  }

  const [row] = await db
    .select({
      stripeCustomerId: users.stripeCustomerId,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  let customerId = row?.stripeCustomerId;
  if (!customerId && row?.email) {
    const customer = await stripe.customers.create({
      email: row.email,
      name: row.name || undefined,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await db
      .update(users)
      .set({ stripeCustomerId: customer.id })
      .where(eq(users.id, session.user.id));
  }

  if (!customerId) {
    return NextResponse.json(
      { ok: false, error: "Nu exista un client Stripe pentru acest cont" },
      { status: 404 }
    );
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${SITE.url}/cont/abonament`,
  });
  return NextResponse.json({ ok: true, url: portal.url });
}
