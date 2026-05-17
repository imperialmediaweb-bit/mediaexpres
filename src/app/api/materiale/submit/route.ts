import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyFbLeadToken } from "@/lib/fb-lead-token";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";
import { findPackageById } from "@/data/packages";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(10),
  firmName: z.string().min(2).max(200),
  firmCui: z.string().min(2).max(30),
  firmAddress: z.string().min(5).max(300),
  firmCity: z.string().min(2).max(100),
  firmContactName: z.string().min(2).max(150),
  firmContactPhone: z.string().min(9).max(40),
  firmInvoiceEmail: z.string().email().max(200),
  packageId: z.string().min(1),
  region: z.string().max(60).optional(),
  county: z.string().max(60).optional(),
  articleMode: z.enum(["write", "ai"]),
  articleTitle: z.string().max(300).optional(),
  articleBody: z.string().max(50000).optional(),
  articleTopic: z.string().max(2000).optional(),
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
  const lead = verifyFbLeadToken(d.token);
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Link expirat sau invalid" }, { status: 400 });
  }

  const pkg = findPackageById(d.packageId);
  let pkgLabel = pkg ? `${pkg.name} — ${pkg.price.toLocaleString("ro")} RON` : d.packageId;
  if (d.packageId === "regional" && d.region) pkgLabel += ` (${d.region})`;
  if (d.packageId === "local" && d.county) pkgLabel += ` (${d.county})`;
  const smartbill = `${d.firmName} | ${d.firmCui} | ${d.firmAddress}, ${d.firmCity} | ${d.firmContactName} | ${d.firmContactPhone} | ${d.firmInvoiceEmail} | ${pkgLabel}`;

  const articleSection =
    d.articleMode === "write"
      ? `
        <h3 style="margin:20px 0 8px;color:#0B2545;">Articol (trimis de client):</h3>
        <p><strong>Titlu:</strong> ${d.articleTitle || "—"}</p>
        <div style="background:#f8f5f0;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:13px;">${d.articleBody || "—"}</div>
      `
      : `
        <h3 style="margin:20px 0 8px;color:#0B2545;">Articol — AI va genera pe baza temei:</h3>
        <div style="background:#f8f5f0;padding:16px;border-radius:8px;">${d.articleTopic || "—"}</div>
      `;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `🚀 Intake nou: ${d.firmName} — ${pkgLabel}`,
    html: wrapEmail(
      `Intake nou — ${d.firmName}`,
      `
      <h2 style="margin:0 0 16px;color:#0B2545;">Date firmă</h2>
      <table style="width:100%;border-collapse:collapse;margin:12px 0;">
        ${kv("Firmă", d.firmName)}
        ${kv("CUI", d.firmCui)}
        ${kv("Adresă", `${d.firmAddress}, ${d.firmCity}`)}
        ${kv("Contact", d.firmContactName)}
        ${kv("Telefon", d.firmContactPhone)}
        ${kv("Email facturare", d.firmInvoiceEmail)}
        ${kv("Pachet", pkgLabel)}
        ${kv("Lead FB", `${lead.name} — ${lead.email} — ${lead.phone}`)}
      </table>
      <div style="background:#0B2545;color:white;padding:16px;border-radius:8px;margin:16px 0;">
        <p style="margin:0 0 8px;font-size:12px;opacity:0.7;">📋 Copy-paste direct în SmartBill:</p>
        <code style="font-size:12px;word-break:break-all;">${smartbill}</code>
      </div>
      ${articleSection}
      `,
    ),
    replyTo: d.firmInvoiceEmail,
  });

  await sendEmail({
    to: d.firmInvoiceEmail,
    subject: "Materialele au fost primite — MediaExpres",
    html: wrapEmail(
      "Materialele au fost primite!",
      `
      <p>Salut ${lead.name.trim().split(/\s+/)[0]},</p>
      <p>Am primit materialele tale pentru pachetul <strong>${pkgLabel}</strong>.</p>
      <p>Publicăm pe cele 50 de ziare în <strong>24 de ore</strong>. Vei primi pe acest email raportul PDF cu toate link-urile și screenshot-urile.</p>
      <p>Factura se emite pe emailul <strong>${d.firmInvoiceEmail}</strong> după publicare.</p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `,
    ),
  });

  return NextResponse.json({ ok: true });
}
