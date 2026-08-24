import { NEWSPAPERS } from "@/data/newspapers";
import { wrapEmail } from "@/lib/email";
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

export function buildListEmail(firstName: string): string {
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
    <p style="margin-top:24px;">Un articol publicat pe toată rețeaua, cu raport complet cu linkuri, costă <strong>500 lei</strong> (ofertă de intrare) — publicare în maximum 4 ore lucrătoare. Articolul rămâne permanent online.</p>
    <p>Cum funcționează: plătești online cu cardul (primești automat <strong>factură fiscală</strong>), apoi ne dai articolul tău sau îl scriem noi din datele firmei tale — plus până la 3 poze.</p>
    <p style="margin:24px 0;text-align:center;"><a href="${SITE.url}/oferta-500" style="display:inline-block;background:#c1121f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Comandă acum — 500 lei</a></p>
    <p style="font-size:14px;color:#64748b;">Preferi <strong>transfer bancar (OP)</strong>? Răspunde la acest email cu datele firmei (denumire + CUI) și îți trimitem detaliile de plată. După confirmarea plății publicăm articolul și livrăm împreună <strong>raportul cu toate linkurile și factura fiscală</strong>.</p>
    <p>Ai întrebări? Răspunde direct la acest email sau scrie-ne pe WhatsApp la <strong>${SITE.phone}</strong>.</p>
    <p style="margin-top:24px;">Cu respect,<br/><strong>Echipa MediaExpres</strong></p>
    `,
  );
}
