import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";

export const runtime = "nodejs";

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
    return NextResponse.json(
      { ok: false, error: "Signature missing" },
      { status: 400 }
    );
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed", err);
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email =
      session.customer_details?.email || session.customer_email || "";
    const amount = (session.amount_total || 0) / 100;
    const packageLabel = session.metadata?.packageId || "—";
    const firstName = (session.customer_details?.name || "").split(" ")[0] || "";

    const adminHtml = wrapEmail(
      "Plată primită — Stripe",
      `
      <p>O plată a fost procesată cu succes prin Stripe.</p>
      <table style="width:100%;border-collapse:collapse;">
        ${kv("Pachet", packageLabel)}
        ${kv("Sumă", `${amount.toFixed(2)} RON`)}
        ${kv("Email client", email)}
        ${kv("Nume client", session.customer_details?.name || "—")}
        ${kv("Session ID", session.id)}
      </table>
      <p style="margin-top:16px;color:#64748b;">Contactează clientul pentru detaliile articolului.</p>
    `
    );

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[Plata Stripe] ${packageLabel} — ${amount.toFixed(2)} RON`,
      html: adminHtml,
      replyTo: email || undefined,
    });

    if (email) {
      const customerHtml = wrapEmail(
        "Plată confirmată — MediaExpres",
        `
        <p>Salut${firstName ? " " + firstName : ""},</p>
        <p>Îiți mulțumim pentru plata efectuată! Am primit <strong>${amount.toFixed(2)} RON</strong> pentru pachetul <strong>${packageLabel}</strong>.</p>
        <p>Un membru al echipei te va contacta pe email în maximum 2 ore (în timpul programului) cu detaliile de publicare.</p>
        <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `
      );
      await sendEmail({
        to: email,
        subject: "Plată confirmată — MediaExpres",
        html: customerHtml,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
