import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects, prospectOrders } from "@/db/schema";
import { verifyProspectToken } from "@/lib/prospect-token";
import { prospectOrderSchema } from "@/lib/validators";
import { sendEmail, wrapEmail, kv, ADMIN_EMAIL } from "@/lib/email";

export const runtime = "nodejs";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const decoded = verifyProspectToken(token);
  if (!decoded) {
    return NextResponse.json(
      { error: "Link expirat sau invalid" },
      { status: 401 }
    );
  }

  const [prospect] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, decoded.prospectId))
    .limit(1);
  if (!prospect) {
    return NextResponse.json({ error: "Prospect inexistent" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  if (!raw) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }

  const parsed = prospectOrderSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message || "Date invalide";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  // Honeypot: pretend success without saving.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const data = parsed.data;

  const [order] = await db
    .insert(prospectOrders)
    .values({
      prospectId: prospect.id,
      packageId: data.packageId,
      buyerCompanyName: data.buyerCompanyName,
      buyerCui: data.buyerCui,
      buyerRegCom: data.buyerRegCom || null,
      buyerAddress: data.buyerAddress,
      buyerEmail: data.buyerEmail,
      buyerPhone: data.buyerPhone || null,
      articleTopic: data.articleTopic,
      articleNotes: data.articleNotes || null,
      photoLinks: data.photoLinks || null,
      status: "pending",
    })
    .returning();

  await db
    .update(prospects)
    .set({ status: "interested", updatedAt: new Date() })
    .where(eq(prospects.id, prospect.id));

  // Admin notification — full order details so the user can publish + invoice manually.
  const adminBody = `
    <p>Comandă nouă de la prospect <strong>${escapeHtml(
      prospect.companyName
    )}</strong> (industry: ${escapeHtml(prospect.industry || "-")}).</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      ${kv("Pachet", data.packageId)}
      ${kv("Denumire firmă cumpărător", data.buyerCompanyName)}
      ${kv("CUI", data.buyerCui)}
      ${kv("Reg. Com.", data.buyerRegCom)}
      ${kv("Adresă", data.buyerAddress)}
      ${kv("Email factură", data.buyerEmail)}
      ${kv("Telefon", data.buyerPhone)}
      ${kv("Prospect ID", prospect.id)}
      ${kv("Order ID", order.id)}
    </table>
    <h3 style="margin-top:24px;font-family:Georgia,serif;color:#0B2545;">Tematica articolului</h3>
    <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;white-space:pre-wrap;">${escapeHtml(
      data.articleTopic
    )}</div>
    ${
      data.photoLinks
        ? `<h3 style="margin-top:24px;font-family:Georgia,serif;color:#0B2545;">Link-uri poze</h3><div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;white-space:pre-wrap;">${escapeHtml(
            data.photoLinks
          )}</div>`
        : ""
    }
    ${
      data.articleNotes
        ? `<h3 style="margin-top:24px;font-family:Georgia,serif;color:#0B2545;">Note client</h3><div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;white-space:pre-wrap;">${escapeHtml(
            data.articleNotes
          )}</div>`
        : ""
    }
  `;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[Comandă nouă] ${prospect.companyName} → ${data.packageId}`,
    html: wrapEmail(`Comandă nouă: ${data.buyerCompanyName}`, adminBody),
    replyTo: data.buyerEmail,
  });

  // Buyer confirmation
  await sendEmail({
    to: data.buyerEmail,
    subject: "Comanda ta a fost primită — MediaExpres",
    html: wrapEmail(
      `Mulțumim, ${escapeHtml(data.buyerCompanyName)}!`,
      `
        <p>Am preluat comanda ta pentru pachetul <strong>${escapeHtml(
          data.packageId
        )}</strong>.</p>
        <p>În maximum 12 ore primești pe această adresă:</p>
        <ul style="margin:12px 0;padding-left:20px;">
          <li>Raportul PDF cu toate linkurile către articolele publicate</li>
          <li>Factura fiscală emisă cu CUI-ul firmei tale</li>
        </ul>
        <p>Plata se face după publicare, pe baza facturii. Fără plată în avans, fără proforma.</p>
        <p style="margin-top:24px;color:#64748b;font-size:13px;">Comandă #${order.id.slice(
          0,
          8
        )}</p>
      `
    ),
  });

  return NextResponse.json({ ok: true, orderId: order.id });
}
