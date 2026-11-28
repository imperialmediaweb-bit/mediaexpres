import { sendEmail, wrapEmail, escapeHtml as esc, bankTransferEmailBox, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";
import { gasesteComanda } from "@/lib/comanda-ref";
import { linkProforma, numarProforma } from "@/lib/proforma";
import { raportUrl } from "@/lib/raport-link";

/**
 * Pasul „platesc prin OP": emailul catre client cu PROFORMA (facuta de noi) si
 * contul. 28.11.2026 (owner): factura StartCo nu mai pleaca aici, ci la
 * confirmarea incasarii (/api/admin/materiale/[id], confirm_payment) — altfel
 * ramaneau facturi pentru comenzi neplatite. Folosit si de /api/comanda/transfer (comanda
 * direct prin OP), si de /api/comanda/plata (clientul a trimis intai
 * formularul si alege OP abia pe pagina de plata).
 */
export async function pornestePlataOp(args: {
  email: string;
  companyName: string;
  cui: string;
  address: string;
  phone: string;
  pkgName: string;
  price: number;
  reference: string;
  hasProof?: boolean;
}) {
  const { email, companyName, pkgName, price, reference } = args;
  const row = await gasesteComanda(reference).catch(() => null);
  const nr = row ? numarProforma(row.id, row.createdAt) : reference.slice(0, 12).toUpperCase();
  const link = linkProforma(reference);

  await sendEmail({
    to: email,
    replyTo: ADMIN_EMAIL,
    subject: `Proforma ${nr} — ${price} lei, plata prin transfer`,
    html: wrapEmail(
      "Proforma comenzii tale",
      `
      <p>Bună ziua${companyName ? `, ${esc(companyName)}` : ""},</p>
      <p>Am primit comanda pentru <strong>${esc(pkgName)}</strong> — ${price} lei. Mai jos aveți proforma și datele pentru plată.</p>
      <p style="margin:16px 0;"><a href="${link}" style="background:#E4002B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Vezi și descarcă proforma ${nr}</a></p>
      <p><strong>Ce urmează, în ordine:</strong></p>
      <ol style="padding-left:20px;margin:8px 0 16px;">
        <li style="margin:6px 0;"><strong>Plătiți prin transfer bancar</strong>, cu <strong>${nr}</strong> la detalii plată.</li>
        <li style="margin:6px 0;"><strong>Urcați dovada plății</strong> pe pagina proformei (sau răspundeți la acest email cu ea), ca să pornim imediat.</li>
        <li style="margin:6px 0;"><strong>Publicăm în maximum 12 ore lucrătoare</strong> de la încasare și primiți raportul cu toate linkurile.</li>
        <li style="margin:6px 0;"><strong>Factura fiscală</strong> vine pe email imediat după încasare.</li>
      </ol>
      ${row ? `<p><strong>Urmăriți comanda în timp real:</strong> <a href="${raportUrl(row.id)}">${raportUrl(row.id)}</a><br/><span style="color:#64748b;font-size:13px;">Acum vedeți pașii comenzii (primită, plată, redacție). Când apar articolele, aici apare fiecare ziar, cu data, ora și linkul.</span></p>` : ""}
      ${args.hasProof ? '<p>Dovada plății pe care ați atașat-o ne ajută să confirmăm mai repede — mulțumim.</p>' : ""}
      ${bankTransferEmailBox(`${price} lei`, nr)}
      <p style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:12px;font-size:13px;color:#78350f;"><strong>De reținut:</strong> la comandă ați declarat că articolul nu prezintă tratamente sau metode de vindecare pentru boli și nu conține alt conținut interzis. Dacă la verificare se dovedește altfel, comanda se anulează, articolul nu se publică <strong>și suma plătită nu se restituie</strong> (art. 4 din <a href="${SITE.url}/legal/termeni">Termeni și condiții</a>). Dacă aveți un dubiu, întrebați-ne ÎNAINTE să plătiți — răspundem repede.</p>
      <p>Întrebări? Răspundeți la acest email sau scrieți-ne pe WhatsApp la <strong>${SITE.phone}</strong>.</p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `,
    ),
  }).catch((e) => console.error("[comanda-op] mail proforma:", e));
}
