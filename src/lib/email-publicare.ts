import { sendEmail, wrapEmail } from "@/lib/email";
import { NEWSPAPERS } from "@/data/newspapers";
import { raportUrl } from "@/lib/raport-link";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Numele ziarului vine din rețea: domeniul singur nu-l dă.
const BY_HOST = new Map(NEWSPAPERS.map((n) => [hostOf(n.url), n.name] as const));

function numeZiar(url: string): string {
  return BY_HOST.get(hostOf(url)) || hostOf(url) || url;
}

interface Args {
  to: string;
  /** Numele complet al clientului; se folosește doar primul cuvânt. */
  name?: string | null;
  articleId: string;
  title: string;
  urls: string[];
}

/**
 * Emailul de publicare: ce s-a publicat, în ce ziare, și linkul raportului.
 *
 * Varianta de dinainte trimitea în cont și lista URL-urile brute, deci
 * clientul avea nevoie de parolă ca să vadă unde i-a apărut articolul, iar
 * în email citea domenii, nu nume de ziare. Acum primește linkul raportului,
 * care se deschide fără autentificare și se actualizează în timp real cât
 * timp publicarea e în curs.
 */
export async function sendEmailPublicare(args: Args) {
  const first = (args.name || "").trim().split(" ")[0];
  const link = raportUrl(args.articleId);

  const rows = args.urls
    .map(
      (url) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
          <div style="font-weight:600;color:#0b1b33;">${escapeHtml(numeZiar(url))}</div>
          <a href="${url}" style="color:#E4002B;font-size:13px;word-break:break-all;">${escapeHtml(url)}</a>
        </td>
      </tr>`
    )
    .join("");

  return sendEmail({
    to: args.to,
    subject: `Campania a fost publicată — ${args.title}`,
    html: wrapEmail(
      "Campania a fost publicată",
      `
      <p>Salut${first ? " " + escapeHtml(first) : ""},</p>
      <p><strong>${escapeHtml(args.title)}</strong> a fost publicat în
        <strong>${args.urls.length} ziare</strong> din rețeaua MediaExpres.</p>
      <p>Pe linkul de mai jos vezi în timp real campania dumneavoastră publicată —
        se deschide fără parolă, se actualizează singur și rămâne valabil permanent.</p>

      <p style="margin:24px 0;">
        <a href="${link}" style="background:#E4002B;color:#fff;padding:13px 22px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">Vezi raportul campaniei</a>
      </p>
      <p style="font-size:13px;color:#64748b;margin-top:-12px;">
        <a href="${link}" style="color:#E4002B;word-break:break-all;">${link}</a>
      </p>

      <h3 style="margin:28px 0 4px 0;font-family:Georgia,serif;color:#0b1b33;font-size:17px;">Unde a fost publicat</h3>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>

      <p style="margin-top:28px;color:#64748b;font-size:13px;">Link-urile sunt permanente și indexate în Google. Publicăm articolul și îți dăm link-urile; dacă aduce vizitatori sau clienți nu este ceva ce promitem.</p>
    `
    ),
  });
}
