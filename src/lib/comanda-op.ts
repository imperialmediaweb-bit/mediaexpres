import { sendEmail, wrapEmail, escapeHtml as esc, bankTransferEmailBox } from "@/lib/email";
import { issueInvoiceForOrder } from "@/lib/invoicing";
import { SITE } from "@/data/site";

/**
 * Pasul „platesc prin OP": emailul catre client cu pasii si contul, plus
 * factura automata NEINCASATA. Folosit si de /api/comanda/transfer (comanda
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
  const { email, companyName, cui, address, phone, pkgName, price, reference } = args;

  sendEmail({
    to: email,
    subject: "Am primit comanda ta — MediaExpres",
    html: wrapEmail(
      "Comandă primită",
      `
      <p>Salut,</p>
      <p>Am primit comanda și materialele pentru <strong>${esc(pkgName)}</strong> — ${price} lei.</p>
      <p><strong>Ce urmează, în ordine:</strong></p>
      <ol style="padding-left:20px;margin:8px 0 16px;">
        <li style="margin:6px 0;"><strong>Îți trimitem factura fiscală</strong> pe acest email, în câteva minute.</li>
        <li style="margin:6px 0;"><strong>Plătești prin transfer bancar</strong> — datele contului sunt mai jos, ca să le ai la îndemână.</li>
        <li style="margin:6px 0;"><strong>Publicăm în maximum 12 ore lucrătoare</strong> de la încasare și primești raportul cu toate cele 50 de linkuri.</li>
      </ol>
      ${args.hasProof ? '<p>Dovada plății pe care ai atașat-o ne ajută să confirmăm mai repede — mulțumim.</p>' : ""}
      ${bankTransferEmailBox(`${price} lei`, `${esc(pkgName)} — ${esc(companyName)}`)}
      <p style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:12px;font-size:13px;color:#78350f;"><strong>De reținut:</strong> la comandă ai declarat că articolul nu prezintă tratamente sau metode de vindecare pentru boli și nu conține alt conținut interzis. Dacă la verificare se dovedește altfel, comanda se anulează, articolul nu se publică <strong>și suma plătită nu se restituie</strong> (art. 4 din <a href="${SITE.url}/legal/termeni">Termeni și condiții</a>). Dacă ai un dubiu, întreabă-ne ÎNAINTE să plătești — răspundem repede.</p>
      <p>Dacă între timp ai întrebări, răspunde la acest email sau scrie-ne pe WhatsApp la <strong>${SITE.phone}</strong>.</p>
      <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
      `,
    ),
  }).catch((e) => console.error("[comanda-op] mail client:", e));

  // Factura pleaca AUTOMAT, neincasata (markPaid: false): clientul nu poate
  // plati fara document. Best-effort — issueInvoiceForOrder isi inghite
  // erorile si alerteaza adminul.
  void issueInvoiceForOrder({
    email,
    customerName: companyName,
    cui,
    address,
    phone,
    amount: price,
    packageLabel: pkgName,
    orderReference: reference,
    markPaid: false,
    mentions: `Plata prin transfer bancar (OP). Ref: ${reference}`,
  }).catch((e) => console.error("[comanda-op] factura automata:", e));
}
