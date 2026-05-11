import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = process.env.FROM_EMAIL || "MediaExpres <noreply@mediaexpress.ro>";
const CONTACT = process.env.CONTACT_EMAIL || "contact@mediaexpress.ro";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; path: string }[];
  // ISO string; Resend schedules the send at this time instead of now.
  scheduledAt?: string;
}

export async function sendEmail(args: SendArgs) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing — logging instead:", args.subject);
    return { ok: true, dryRun: true };
  }
  const payload: Parameters<typeof resend.emails.send>[0] = {
    from: FROM,
    to: args.to,
    subject: args.subject,
    html: args.html,
    replyTo: args.replyTo,
  };
  if (args.scheduledAt) {
    (payload as unknown as { scheduledAt: string }).scheduledAt = args.scheduledAt;
  }
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    console.error("[email] Resend error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data?.id };
}

export const ADMIN_EMAIL = CONTACT;

export function wrapEmail(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F8F5F0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0B2545;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="background:#0B2545;color:#F8F5F0;padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:24px;font-family:Georgia,serif;">Media<span style="color:#E4B363;">Expres</span></h1>
      <p style="margin:6px 0 0 0;font-size:12px;color:#E4B363;letter-spacing:1px;text-transform:uppercase;">Distributie comunicate de presa</p>
    </div>
    <div style="background:#fff;padding:32px 24px;border-radius:0 0 12px 12px;border:1px solid #eee;">
      <h2 style="margin:0 0 16px 0;font-family:Georgia,serif;color:#0B2545;">${title}</h2>
      ${body}
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee;text-align:center;">
        <a href="https://mediaexpress.ro/pachete" style="display:inline-block;background:#C8102E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Vezi pachetele &amp; preturile</a>
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

function escapeHtml(value: string): string {
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
