import { Resend } from "resend";
import { SITE } from "@/data/site";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const RAW_FROM = process.env.FROM_EMAIL || "noreply@mediaexpress.ro";
const CONTACT = process.env.CONTACT_EMAIL || "contact@mediaexpress.ro";
export const SENDER_NAME = process.env.SENDER_NAME || "Andrei Popescu";

/**
 * Numele expeditorului difera dupa TIPUL emailului, si asta e intentionat.
 *
 * Clientul care a comandat asteapta "MediaExpres" in inbox — a platit unei
 * firme, nu unui necunoscut. Factura semnata "Andrei Popescu" il pune sa se
 * intrebe cine e, exact in momentul in care ar trebui sa aiba incredere.
 *
 * La prospectare rece e pe dos: un nume de om deschide mai des decat un brand,
 * pentru ca arata a mesaj scris de cineva, nu a newsletter. De-aia rutele de
 * outreach trec explicit `fromName: SENDER_NAME`, iar tot restul — comenzi,
 * facturi, rapoarte, confirmari — pleaca de la brand.
 */
export const BRAND_SENDER_NAME = process.env.BRAND_SENDER_NAME || "MediaExpres";

function buildFromHeader(name: string): string {
  // Dacă FROM_EMAIL conține deja un display name (format "Name <email>"),
  // respectă configurația.
  if (RAW_FROM.includes("<") && RAW_FROM.includes(">")) return RAW_FROM;
  return `${name} <${RAW_FROM}>`;
}

interface SendArgs {
  to: string;
  subject: string;
  /** Numele afisat in inbox. Implicit brandul; outreach-ul trimite numele personal. */
  fromName?: string;
  html: string;
  text?: string;
  replyTo?: string;
  // `path` = URL public; `content` = continut base64 (pentru fisiere generate/incarcate).
  attachments?: { filename: string; path?: string; content?: string }[];
  // ISO string; Resend schedules the send at this time instead of now.
  scheduledAt?: string;
  // RFC 2369 + RFC 8058 — obligatoriu pentru bulk senders Gmail/Yahoo din 2024.
  // Acceptă "mailto:..." sau "<https://...>" sau ambele separate prin virgulă.
  listUnsubscribe?: string;
  // Resend tags — permite corelarea email-urilor cu entități din DB (ex: prospect_id).
  tags?: Array<{ name: string; value: string }>;
}

export async function sendEmail(args: SendArgs) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing — logging instead:", args.subject);
    return { ok: true, dryRun: true };
  }
  const payload: Parameters<typeof resend.emails.send>[0] = {
    from: buildFromHeader(args.fromName || BRAND_SENDER_NAME),
    to: args.to,
    subject: args.subject,
    html: args.html,
    replyTo: args.replyTo,
  };
  if (args.text) {
    (payload as unknown as { text: string }).text = args.text;
  }
  if (args.attachments && args.attachments.length > 0) {
    (payload as unknown as { attachments: typeof args.attachments }).attachments =
      args.attachments;
  }
  if (args.scheduledAt) {
    (payload as unknown as { scheduledAt: string }).scheduledAt = args.scheduledAt;
  }
  if (args.listUnsubscribe) {
    (payload as unknown as { headers: Record<string, string> }).headers = {
      "List-Unsubscribe": args.listUnsubscribe,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
  }
  if (args.tags && args.tags.length > 0) {
    (payload as unknown as { tags: typeof args.tags }).tags = args.tags;
  }
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    console.error("[email] Resend error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data?.id };
}

export const ADMIN_EMAIL = CONTACT;

// Wrapper bogat-brand pentru email-uri tranzacționale unde clientul așteaptă "MediaExpres"
// (confirmare comandă, factură, raport, etc). Pentru cold outreach folosește wrapEmailCold.
export function wrapEmail(title: string, body: string) {
  // Paleta e cea a site-ului (tailwind.config.ts → brand): rosu #c1121f,
  // negru #111111, crem #faf7f2, auriu #c9a14a. Emailurile aratau alta firma
  // pentru ca ramasesera pe o paleta veche navy/gold.
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="background:#111111;color:#faf7f2;padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:24px;font-family:Georgia,serif;letter-spacing:0.5px;">MEDIA<span style="color:#c1121f;">EXPRES</span></h1>
      <p style="margin:6px 0 0 0;font-size:11px;color:#c9a14a;letter-spacing:2px;text-transform:uppercase;">Presă &middot; Distribuție &middot; Impact</p>
    </div>
    <div style="background:#fff;padding:32px 24px;border-radius:0 0 12px 12px;border:1px solid #e5e5e5;">
      <h2 style="margin:0 0 16px 0;font-family:Georgia,serif;color:#111111;">${title}</h2>
      ${body}
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e5e5;text-align:center;">
        <a href="https://mediaexpress.ro/pachete" style="display:inline-block;background:#c1121f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Vezi pachetele &amp; preturile</a>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;font-size:11px;color:#94a3b8;line-height:1.6;">
      <p style="margin:0;">MediaExpres &middot; <a href="https://mediaexpress.ro" style="color:#94a3b8;">mediaexpress.ro</a> &middot; <a href="mailto:${CONTACT}" style="color:#94a3b8;">${CONTACT}</a></p>
      <p style="margin:8px 0 0 0;">Daca nu doresti sa primesti email-uri de la noi, raspunde cu STOP si te scoatem din lista.</p>
      <p style="margin:8px 0 0 0;">&copy; ${new Date().getFullYear()} MediaExpres &middot; rețea proprie de 50 ziare româneşti</p>
    </div>
  </div>
</body>
</html>`;
}

// Wrapper minimalist pentru cold outreach — arată ca o scrisoare personală, nu newsletter.
// Fară banner colorat, fară buton CTA roto-rositori, fară elemente "marketing".
// Spam-filterele scorează mult mai bine emailurile care arata 1:1 personal.
export function wrapEmailCold(bodyHtml: string, senderName: string = SENDER_NAME) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;font-size:15px;line-height:1.6;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    ${bodyHtml}
    <div style="margin-top:16px;color:#1f2937;">
      <p style="margin:0;">Cu drag,<br/><strong>${senderName}</strong><br/>MediaExpres &middot; <a href="https://mediaexpress.ro" style="color:#1f2937;">mediaexpress.ro</a></p>
    </div>
    <div style="margin-top:32px;font-size:11px;color:#9ca3af;line-height:1.5;">
      <p style="margin:0;">Dacă nu vrei să mai primești emailuri de la mine, răspunde STOP la acest mesaj sau scrie la <a href="mailto:${CONTACT}?subject=STOP" style="color:#9ca3af;">${CONTACT}</a>.</p>
    </div>
  </div>
</body>
</html>`;
}

// Header List-Unsubscribe standard pentru toate emailurile reci.
// Combină mailto (RFC 2369) cu o nota One-Click-compatibilă (RFC 8058).
export function defaultListUnsubscribe() {
  return `<mailto:${CONTACT}?subject=STOP&body=STOP>`;
}

// Caseta cu datele de plata prin transfer bancar (OP), refolosita in orice
// email care ofera plata prin OP. Datele vin din SITE.billing — un singur loc.
// Factura pentru OP se emite manual, dupa confirmarea platii; fara proforma.
export function bankTransferEmailBox(amount: string, paymentDetails: string): string {
  return `
    <div style="margin:20px 0;padding:16px;background:#faf7f2;border:1px solid #e5e5e5;border-radius:8px;font-size:14px;">
      <p style="margin:0 0 10px;"><strong>Plata prin transfer bancar (OP)</strong> — direct în contul nostru:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:3px 0;color:#64748b;width:110px;">Beneficiar</td><td style="padding:3px 0;font-weight:600;">${SITE.billing.company}</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;">IBAN</td><td style="padding:3px 0;font-weight:600;font-family:monospace;">${SITE.billing.iban}</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;">Banca</td><td style="padding:3px 0;font-weight:600;">${SITE.billing.bank}</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;">Suma</td><td style="padding:3px 0;font-weight:600;">${amount}</td></tr>
        <tr><td style="padding:3px 0;color:#64748b;">Detalii plată</td><td style="padding:3px 0;">${paymentDetails}</td></tr>
      </table>
      <p style="margin:10px 0 0;color:#64748b;">După plată nu trebuie să ne trimiți nimic — <strong>vedem încasarea în extras</strong> și publicăm în maximum 12 ore lucrătoare, cu raportul cu toate linkurile. Vrei să grăbim confirmarea? Răspunde la acest email cu ordinul de plată.</p>
      <p style="margin:8px 0 0;color:#64748b;">Nu ai trimis încă comanda pe site? Scrie-ne aici datele firmei (denumire, CUI, adresă) și articolul, ca să emitem factura și să pornim.</p>
    </div>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function kv(label: string, value: string | undefined | null) {
  if (!value) return "";
  return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;">${escapeHtml(value)}</td></tr>`;
}
