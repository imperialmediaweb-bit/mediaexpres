import { NextRequest, NextResponse } from "next/server";
import { orderSchema } from "@/lib/validators";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";
import { findPackageById, SUBSCRIPTION_PLANS } from "@/data/packages";
import { formatPrice } from "@/lib/utils";
import { sendCapiEvent, extractRequestUserData, splitName } from "@/lib/meta-capi";

export const runtime = "nodejs";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Prea multe cereri. Încearcă din nou în câteva minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.website) {
    return NextResponse.json({ ok: true });
  }

  let packageLabel = data.packageId;
  let packagePrice = "";
  let packageValue: number | undefined;
  if (data.packageId.startsWith("sub-")) {
    const sub = SUBSCRIPTION_PLANS.find((s) => s.id === data.packageId.replace("sub-", ""));
    if (sub) {
      packageLabel = `Abonament ${sub.name} (${sub.description})`;
      packagePrice = `${formatPrice(sub.priceStandard)} RON/lună (standard) • ${formatPrice(sub.priceCasino)} RON/lună (cazino)`;
      packageValue = sub.priceStandard;
    }
  } else {
    const pkg = findPackageById(data.packageId);
    if (pkg) {
      packageLabel = `${pkg.name} (${pkg.category === "casino" ? "Cazino" : "Standard"})`;
      packagePrice = `${formatPrice(pkg.price)} RON`;
      packageValue = pkg.price;
    }
  }

  const html = wrapEmail(
    "Comandă nouă MediaExpres",
    `
    <p style="margin:0 0 16px;color:#64748b;">O nouă comandă a fost primită prin formularul de pe site.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${kv("Pachet", packageLabel)}
      ${kv("Preț", packagePrice)}
      ${kv("Nume", data.name)}
      ${kv("Email", data.email)}
      ${kv("Telefon", data.phone)}
      ${kv("Companie", data.company || "—")}
      ${kv("Titlu articol", data.articleTitle)}
      ${kv("URL articol existent", data.articleUrl || "—")}
      ${kv("Observații", data.notes || "—")}
    </table>
    ${
      data.articleBody
        ? `<div style="margin-top:20px;padding:16px;background:#F8F5F0;border-radius:8px;"><strong style="color:#0B2545;">Text articol:</strong><pre style="white-space:pre-wrap;font-family:inherit;margin:8px 0 0;color:#334155;font-size:14px;">${data.articleBody.replace(/</g, "&lt;")}</pre></div>`
        : ""
    }
    <p style="margin:24px 0 0;color:#64748b;font-size:13px;">
      Răspunde direct la acest email pentru a contacta clientul.
    </p>
  `
  );

  const adminResult = await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[Comandă] ${packageLabel} — ${data.name}`,
    html,
    replyTo: data.email,
  });

  const customerHtml = wrapEmail(
    "Comandă primită — MediaExpres",
    `
    <p>Salut ${data.name.split(" ")[0]},</p>
    <p>Îți mulțumim că ai ales MediaExpres! Comanda ta a fost primită cu succes.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${kv("Pachet", packageLabel)}
      ${kv("Preț", packagePrice)}
      ${kv("Titlu articol", data.articleTitle)}
    </table>
    <p>Echipa noastră te va contacta în maximum 2 ore (în timpul programului) cu detaliile de facturare și confirmarea publicării.</p>
    <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
  `
  );

  await sendEmail({
    to: data.email,
    subject: "Am primit comanda ta — MediaExpres",
    html: customerHtml,
  });

  if (!adminResult.ok) {
    return NextResponse.json({ ok: false, error: "Eroare la trimiterea emailului" }, { status: 500 });
  }

  // Meta CAPI: Lead event cu value (cat costa pachetul) ca optimization signal.
  // E mai puternic decat Lead simplu pentru ca Meta poate optimiza catre VALUE.
  const { firstName, lastName } = splitName(data.name);
  const reqUser = extractRequestUserData(req);
  sendCapiEvent({
    eventName: "Lead",
    eventSourceUrl: req.headers.get("referer") || undefined,
    value: packageValue,
    currency: "RON",
    user: {
      email: data.email,
      phone: data.phone,
      firstName,
      lastName,
      ...reqUser,
    },
    customData: {
      content_name: packageLabel,
      content_category: data.packageId.startsWith("sub-") ? "subscription" : "package",
      content_ids: [data.packageId],
    },
  }).catch((err) => console.error("[order] capi error:", err));

  return NextResponse.json({ ok: true });
}
