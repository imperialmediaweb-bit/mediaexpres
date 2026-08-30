import { NEWSPAPERS } from "@/data/newspapers";
import { promoDeadlineLabel } from "@/data/packages";
import { wrapEmail, bankTransferEmailBox } from "@/lib/email";
import { SITE } from "@/data/site";

// UN SINGUR sablon pentru emailul cu lista retelei, generat din ACELEASI date
// ca /reteaua-noastra (data/newspapers.ts). Il folosesc si formularul public
// (/api/request-list) si butonul din admin — cand se schimba un ziar in date,
// toate emailurile sunt automat la zi. Nu promite apeluri sau PDF-uri "dupa o
// convorbire": nu suna nimeni pe nimeni, totul e automat.

const REGION_ORDER: { key: (typeof NEWSPAPERS)[number]["region"]; label: string }[] = [
  { key: "Național", label: "Ziare naționale" },
  { key: "Moldova", label: "Moldova" },
  { key: "Transilvania", label: "Transilvania" },
  { key: "Muntenia", label: "Muntenia + București" },
  { key: "Banat", label: "Banat + Oltenia" },
];

export function newspaperListHtml(): string {
  return REGION_ORDER.map(({ key, label }) => {
    const items = NEWSPAPERS.filter((n) => n.region === key)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "ro"));
    const rows = items
      .map((n) => {
        const where = n.county ? ` <span style="color:#94a3b8;">— ${n.county}</span>` : "";
        return `<li style="margin:4px 0;"><a href="${n.url}" style="color:#c1121f;text-decoration:none;font-weight:600;">${n.name}</a>${where}</li>`;
      })
      .join("");
    return `
      <h3 style="margin:20px 0 6px;font-family:Georgia,serif;color:#111111;font-size:16px;border-bottom:1px solid #e5e5e5;padding-bottom:4px;">${label} <span style="color:#94a3b8;font-weight:400;font-size:13px;">(${items.length})</span></h3>
      <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.5;">${rows}</ul>`;
  }).join("");
}

// CIFRA OFICIALA, aceeasi ca pe site, in reclame si in contracte: 50.
// In date pot exista cateva publicatii in plus (livram mai mult decat vindem) —
// bonusul se spune explicit, ca cititorul care numara linkurile sa nu vada
// doua cifre diferite.
const OFFICIAL_TOTAL = 50;
const bonus = NEWSPAPERS.length - OFFICIAL_TOTAL;

export const LIST_EMAIL_SUBJECT = `Lista completă — cele ${OFFICIAL_TOTAL} de ziare MediaExpres`;

// Intrebarea "cate caractere trebuie sa aiba articolul si cat dureaza" vine de
// fiecare data. Cifrele de aici sunt cele reale, aceleasi ca in formularul de
// trimitere a articolului (min. 100 de caractere acceptate tehnic) si ca in
// promisiunea de pe /oferta-500 (24 de ore lucratoare). Nu inventam un "ideal" pe
// care nu-l cerem nicaieri altundeva.
export const ARTICLE_SPECS_HTML = `
    <h3 style="margin:24px 0 6px;font-family:Georgia,serif;color:#111111;font-size:16px;border-bottom:1px solid #e5e5e5;padding-bottom:4px;">Specificațiile articolului</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.5;">
      <tr>
        <td style="padding:6px 8px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap;">Lungime</td>
        <td style="padding:6px 0;color:#111111;"><strong>300–500 de cuvinte</strong> (aproximativ 2.000–3.500 de caractere). Acceptăm și mai scurt — minimul tehnic e 100 de caractere — dar sub 300 de cuvinte articolul are efect SEO mai slab.</td>
      </tr>
      <tr>
        <td style="padding:6px 8px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap;">Linkuri</td>
        <td style="padding:6px 0;color:#111111;">Până la <strong>3 linkuri</strong> către site-ul tău, cu textul de ancoră ales de tine. Sunt <strong>dofollow</strong> și rămân active permanent.</td>
      </tr>
      <tr>
        <td style="padding:6px 8px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap;">Imagini</td>
        <td style="padding:6px 0;color:#111111;">Până la <strong>3 poze</strong>. Opțional — dacă nu ai, publicăm fără.</td>
      </tr>
      <tr>
        <td style="padding:6px 8px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap;">Durată</td>
        <td style="padding:6px 0;color:#111111;"><strong>Maximum 24 de ore lucrătoare</strong> de la confirmarea comenzii până când toate linkurile sunt live. Primești raportul cu toate adresele pe email, în PDF și Excel.</td>
      </tr>
      <tr>
        <td style="padding:6px 8px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap;">Dacă nu ai text</td>
        <td style="padding:6px 0;color:#111111;">Îl scriem noi, inclus în preț — ne dai tema, datele firmei și linkurile, restul facem noi.</td>
      </tr>
    </table>`;

export function buildListEmail(firstName: string): string {
  const deadline = promoDeadlineLabel();
  return wrapEmail(
    `Lista completă a celor ${OFFICIAL_TOTAL} de ziare`,
    `
    <p>Salut ${firstName},</p>
    <p>Mai jos ai <strong>toate publicațiile</strong> din rețeaua MediaExpres — dă click pe oricare să o vezi live. Fiecare are și pagină de Facebook asociată.${
      bonus > 0
        ? ` În listă sunt ${NEWSPAPERS.length}: promitem ${OFFICIAL_TOTAL}, publicăm pe toate — ${bonus === 1 ? "una e" : `${bonus} sunt`} bonus.`
        : ""
    }</p>
    ${newspaperListHtml()}
    <p style="margin-top:24px;">Un articol publicat pe toată rețeaua, cu raport complet cu linkuri, costă <strong>500 lei</strong> (ofertă de intrare${deadline ? `, <strong>valabilă până pe ${deadline}</strong>` : ""}) — publicare în maximum 24 de ore lucrătoare. Articolul rămâne permanent online.</p>
    <p><strong>Fără conținut duplicat:</strong> fiecare ziar primește o variantă unică a articolului — alt titlu, altă formulare, același mesaj și aceleași linkuri către site-ul tău.</p>
    <p>Cum funcționează: plătești online cu cardul (primești automat <strong>factură fiscală</strong>), apoi ne dai articolul tău sau îl scriem noi din datele firmei tale — plus până la 3 poze.</p>
    ${ARTICLE_SPECS_HTML}
    <p style="margin:24px 0;text-align:center;"><a href="${SITE.url}/oferta-500" style="display:inline-block;background:#c1121f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Comandă acum — 500 lei</a></p>
    ${bankTransferEmailBox("500 lei", "Publicare articol — 50 de ziare")}
    <p>Ai întrebări? Răspunde direct la acest email sau scrie-ne pe WhatsApp la <strong>${SITE.phone}</strong>.</p>
    <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
    `,
  );
}
