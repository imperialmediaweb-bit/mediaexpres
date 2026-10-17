import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderSubmissions } from "@/db/schema";
import { getStripe } from "@/lib/stripe";
import { findPackageById } from "@/data/packages";
import { SITE } from "@/data/site";
import { gasesteComanda } from "@/lib/comanda-ref";
import { pornestePlataOp } from "@/lib/comanda-op";
import { extractRequestUserData } from "@/lib/meta-capi";
import { sursaDinCerere } from "@/lib/sursa";
import { extractGaClientId } from "@/lib/ga-mp";

export const runtime = "nodejs";

const schema = z.object({
  ref: z.string().min(10).max(80),
  metoda: z.enum(["card", "op"]),
});

/**
 * 17.10.2026 — pasul de dupa formular: clientul si-a trimis deja articolul si
 * datele firmei (verificate la ANAF) si alege acum cum plateste.
 *
 * card → sesiune Stripe pe comanda lui, cu firma si CUI-ul deja completate;
 *        webhookul leaga plata de comanda (metadata.orderRef) si emite
 *        factura incasata.
 * op   → factura neincasata pe email, cu IBAN-ul — ca pe traseul de transfer.
 */
export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  const { ref, metoda } = parsed.data;

  const row = await gasesteComanda(ref);
  if (!row) return NextResponse.json({ ok: false, error: "Comanda nu există." }, { status: 404 });
  if (row.status !== "pending_payment") {
    return NextResponse.json({ ok: false, error: "Comanda e deja plătită." }, { status: 409 });
  }
  const pkg = findPackageById(row.packageId);
  if (!pkg) return NextResponse.json({ ok: false, error: "Pachet inexistent" }, { status: 400 });

  if (metoda === "op") {
    // Idempotent: a doua apasare pe „OP" nu mai emite o factura.
    if (row.paymentMethod === "op") return NextResponse.json({ ok: true, metoda });
    const updated = await db
      .update(orderSubmissions)
      .set({ paymentMethod: "op" })
      .where(and(eq(orderSubmissions.id, row.id), eq(orderSubmissions.paymentMethod, "nedecis")))
      .returning({ id: orderSubmissions.id });
    if (updated.length) {
      await pornestePlataOp({
        email: row.email,
        companyName: row.companyName || "",
        cui: row.companyCui || row.cui || "",
        address: row.companyAddress || row.billingAddress || "",
        phone: row.contactPhone || "",
        pkgName: pkg.name,
        price: pkg.price,
        reference: ref,
      });
    }
    return NextResponse.json({ ok: true, metoda });
  }

  // La card: o factura OP deja emisa ar insemna doua facturi pe aceeasi comanda.
  if (row.paymentMethod === "op") {
    return NextResponse.json(
      { ok: false, error: "Ai ales deja plata prin OP și factura a plecat pe email. Pentru card, scrie-ne pe WhatsApp." },
      { status: 409 },
    );
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ ok: false, error: "Plata cu cardul nu e disponibilă acum." }, { status: 503 });

  const fbAttr = extractRequestUserData(req);
  const gaCid = extractGaClientId(req);
  const sursa = row.source || sursaDinCerere(req);

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      // Fara „Alegeți moneda" (vezi api/checkout). Campul lipseste din tipurile SDK-ului v17.
      ...({ adaptive_pricing: { enabled: false } } as object),
      customer_email: row.email,
      line_items: [
        {
          price_data: {
            currency: "ron",
            unit_amount: pkg.price * 100,
            product_data: {
              name: `${pkg.name}${row.ziareAlese ? ` — ${row.ziareAlese}` : ""}`,
              description: `Comanda pentru ${row.companyName || row.email}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        packageId: row.packageId,
        mode: "package",
        category: pkg.category,
        orderRef: ref,
        ...(row.ziareAlese ? { ziare: row.ziareAlese } : {}),
        ...(fbAttr.fbp ? { fbp: fbAttr.fbp } : {}),
        ...(fbAttr.fbc ? { fbc: fbAttr.fbc } : {}),
        ...(gaCid ? { gacid: gaCid } : {}),
        ...(sursa ? { sursa } : {}),
      },
      // Contabila identifica incasarile dupa firma si CUI — le vrea pe
      // tranzactie. Aici vin deja completate, din datele verificate la ANAF.
      billing_address_collection: "auto",
      custom_fields: [
        {
          key: "company_name",
          label: { type: "custom", custom: "Nume firma" },
          type: "text",
          optional: true,
          text: { default_value: (row.companyName || "").slice(0, 255) },
        },
        {
          key: "company_cui",
          label: { type: "custom", custom: "CUI" },
          type: "text",
          optional: true,
          text: { default_value: (row.companyCui || row.cui || "").slice(0, 255) },
        },
      ],
      payment_intent_data: {
        description: `${pkg.name} — ${row.companyName || row.email} (CUI ${row.companyCui || row.cui || "-"})`,
        metadata: {
          orderRef: ref,
          firma: (row.companyName || "").slice(0, 400),
          cui: (row.companyCui || row.cui || "").slice(0, 40),
        },
      },
      success_url: `${SITE.url}/comanda/plata/${ref}?platit=1`,
      cancel_url: `${SITE.url}/comanda/plata/${ref}`,
      locale: "ro",
      allow_promotion_codes: true,
    });
    return NextResponse.json({ ok: true, url: checkout.url });
  } catch (err) {
    console.error("[comanda/plata] stripe:", err);
    return NextResponse.json({ ok: false, error: "Nu am putut deschide plata cu cardul. Încearcă din nou." }, { status: 500 });
  }
}
