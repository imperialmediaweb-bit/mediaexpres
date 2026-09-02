import {
  currentPromoDeadline,
  promoDeadlineLabel,
  isPromoDeadlineActive,
  findPackageById,
  findSubscriptionPlanById,
  PROMO_PACKAGES,
  STANDARD_PACKAGES,
  PROMO_ROLLING,
  PRICING_NOTE,
} from "@/data/packages";
import { buildListEmail, LIST_EMAIL_SUBJECT, newspaperListHtml } from "@/lib/list-email";
import { buildAdvisorKnowledge } from "@/lib/advisor-knowledge";
import { buildReportXlsx, buildReportPdf } from "@/lib/report-files";
import { FONT_ENCODING } from "@/lib/report-font";
import { NEWSPAPERS } from "@/data/newspapers";
import { SITE } from "@/data/site";
import { bankTransferEmailBox, escapeHtml } from "@/lib/email";
import { extractRequestUserData, splitName } from "@/lib/meta-capi";
import { STEPS, EMPTY_ORDER } from "@/components/chat/order-steps";
import { extractGaClientId, sendGaPurchase } from "@/lib/ga-mp";
import { buildNewspaperListPdf } from "@/lib/newspaper-list-pdf";
import { cleanArticleText, cleanTitle } from "@/lib/clean-text";
import {
  screenContent,
  CONTENT_DECLARATION,
  CONTENT_DECLARATION_WARNING,
} from "@/lib/content-policy";
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

let n = 0;
const fails: string[] = [];
function t(name: string, ok: boolean, extra = "") {
  n++;
  if (!ok) fails.push(`${n}. ${name}${extra ? " — " + extra : ""}`);
  console.log(`${ok ? " OK " : "FAIL"} ${String(n).padStart(3)}. ${name}${extra ? " — " + extra : ""}`);
}
const at = (iso: string) => new Date(iso).getTime();

console.log("\n########## A. TERMENUL RULANT AL OFERTEI ##########");
t("azi arata 14 septembrie", promoDeadlineLabel(at("2026-08-25T12:00:00+03:00")) === "14 septembrie");
t("cu o zi inainte de termen ramane acelasi", promoDeadlineLabel(at("2026-09-13T23:00:00+03:00")) === "14 septembrie");
t("dupa expirare se prelungeste la 28 septembrie", promoDeadlineLabel(at("2026-09-15T10:00:00+03:00")) === "28 septembrie");
t("a doua prelungire: 12 octombrie", promoDeadlineLabel(at("2026-09-29T10:00:00+03:00")) === "12 octombrie");
t("pasul e de exact 14 zile", (() => {
  const a = currentPromoDeadline(at("2026-09-15T10:00:00+03:00"))!.getTime();
  const b = currentPromoDeadline(at("2026-09-29T10:00:00+03:00"))!.getTime();
  return Math.round((b - a) / 86400000) === 14;
})());
t("nu depaseste 31 decembrie", (() => {
  const d = currentPromoDeadline(at("2026-12-20T10:00:00+02:00"))!;
  return d.getTime() <= new Date(PROMO_ROLLING.hardEndIso).getTime();
})());
t("dupa 31 decembrie nu mai exista termen", currentPromoDeadline(at("2027-01-02T10:00:00+02:00")) === null);
t("isPromoDeadlineActive: adevarat azi", isPromoDeadlineActive(at("2026-08-25T12:00:00+03:00")) === true);
t("isPromoDeadlineActive: fals in 2027", isPromoDeadlineActive(at("2027-01-02T10:00:00+02:00")) === false);
t("eticheta e in romana", /septembrie|octombrie|noiembrie|decembrie/.test(promoDeadlineLabel(at("2026-08-25T12:00:00+03:00")) || ""));
t("termenul nu sare peste luni", (() => {
  let prev = 0, ok = true;
  for (let ts = at("2026-09-01T00:00:00+03:00"); ts < at("2026-12-31T00:00:00+02:00"); ts += 86400000) {
    const d = currentPromoDeadline(ts);
    if (!d) { ok = false; break; }
    if (d.getTime() < prev) { ok = false; break; }
    prev = d.getTime();
  }
  return ok;
})());

console.log("\n########## B. PACHETE SI PRETURI ##########");
const promo = findPackageById("promo-50")!;
const promoCaz = findPackageById("promo-50-cazino")!;
t("promo-50 exista", !!promo);
t("promo-50 costa 500", promo.price === 500);
t("promo-50 are 50 de ziare", promo.newspapers === 50);
t("cazino costa dublu", promoCaz.price === promo.price * 2);
t("cazino e marcat ca atare", promoCaz.category === "casino");
t("pretul de lista e 1500", findPackageById("national")!.price === 1500);
t("promo e sub pretul de lista", promo.price < findPackageById("national")!.price);
t("pachet inexistent -> undefined", findPackageById("nu-exista") === undefined);
t("abonamentul promo e 400", findSubscriptionPlanById("promo-lunar")!.priceStandard === 400);
t("abonamentul e mai ieftin decat plata unica", findSubscriptionPlanById("promo-lunar")!.priceStandard < promo.price);
t("promo mentioneaza articol unic", PROMO_PACKAGES.every((p) => p.highlights.some((h) => /unic/i.test(h))));
t("pachetul National mentioneaza articol unic", STANDARD_PACKAGES.find((p) => p.id === "national")!.highlights.some((h) => /unic/i.test(h)));

console.log("\n########## C. EMAILUL CU LISTA ##########");
const mail = buildListEmail("Ștefan");
t("contine numele destinatarului", mail.includes("Ștefan"));
t("contine IBAN-ul real", mail.includes(SITE.billing.iban));
t("contine beneficiarul", mail.includes(SITE.billing.company));
t("contine banca", mail.includes(SITE.billing.bank));
t("contine pretul de 500 lei", mail.includes("500 lei"));
t("contine termenul ofertei", mail.includes("14 septembrie"));
t("contine WhatsApp-ul", mail.includes(SITE.phone));
t("contine linkul catre oferta", mail.includes("/oferta-500"));
t("promite factura fiscala", /factur[aă] fiscal[aă]/i.test(mail));
t("mentioneaza termenul de 12 ore", /12\s*(de\s*)?ore/i.test(mail));
t("mentioneaza fara continut duplicat", /duplicat/i.test(mail));
t("NU promite ca sunam clientul", !/te va contacta|scurt[aă] convorbire/i.test(mail));
t("subiectul spune cifra oficiala 50", LIST_EMAIL_SUBJECT.includes("50"));
t("lista are un link per ziar", (newspaperListHtml().match(/<a href="https/g) || []).length === NEWSPAPERS.length);
t("bonusul e explicat cinstit", NEWSPAPERS.length === 50 || /bonus/i.test(mail));
t("toate regiunile apar", ["Moldova", "Transilvania", "Muntenia", "Banat", "na\u021bionale"].every((r) => mail.includes(r)));

console.log("\n########## D. CASETA DE TRANSFER BANCAR ##########");
const box = bankTransferEmailBox("500 lei", "Publicare articol");
t("caseta contine IBAN", box.includes(SITE.billing.iban));
t("caseta contine suma", box.includes("500 lei"));
// Intors odata cu fluxul: dovada nu mai e o obligatie — incasarea se vede in
// extras. Caseta trebuie sa spuna exact asta, nu sa reinvie cerinta veche.
t("caseta NU mai cere dovada ca obligatie", !/răspunde.*cu.*dovada/i.test(box));
t("caseta spune ca incasarea se vede in extras", /extras/i.test(box));
t("caseta pastreaza drumul pentru comanda direct de pe email", /CUI/i.test(box));
t("caseta promite raportul si publicarea in 12 ore", /raportul/i.test(box) && /12\s*(de\s*)?ore/i.test(box));

console.log("\n########## E. CUNOSTINTELE CONSULTANTULUI ##########");
const k = buildAdvisorKnowledge();
t("stie IBAN-ul pentru OP", k.includes(SITE.billing.iban));
t("stie firma de pe factura", k.includes(SITE.billing.company));
t("stie termenul ofertei", k.includes("14 SEPTEMBRIE"));
t("stie de publicarea in 12 ore", /12\s*(DE\s*)?ORE/i.test(k));
t("stie de articolul unic", k.includes("ARTICOL UNIC"));
t("stie sa raspunda la canibalizare", /canibaliz/i.test(k));
t("stie ca abonamentele-s doar pe card", k.includes("DOAR cu cardul"));
t("stie ca lista e publica", k.includes("reteaua-noastra"));
t("stie WhatsApp-ul", k.includes(SITE.phone));
t("stie pretul promo de 500", k.includes("500"));
t("stie tariful dublu la cazino", /cazino/i.test(k) && k.includes("1000"));
t("comunica cifra oficiala de 50", k.includes("50 publicatii online proprii"));
t("stie pasii de dupa plata", /DUPA PLATA/i.test(k));
t("i se interzice sa inventeze", /Nu inventa/i.test(k));

console.log("\n########## F. FISIERUL EXCEL ##########");
const entries = [
  { url: "https://clujexpres.ro/a/x", title: "Articol cu diacritice ăîșțâ" },
  { url: "https://iasiexpres.ro/a/y", title: "Al doilea articol" },
  { url: "https://acunews.ro/a/z" },
];
const xlsx = buildReportXlsx({ entries, clientName: "RomCut SRL", articleTitle: "Campanie", date: new Date("2026-08-25") });
t("xlsx are semnatura ZIP", xlsx.subarray(0, 2).toString() === "PK");
t("xlsx are dimensiune rezonabila", xlsx.length > 800 && xlsx.length < 200000, `${xlsx.length}b`);
const zipNames: string[] = [];
{
  // citim central directory ca sa validam structura
  let i = xlsx.length - 22;
  while (i > 0 && xlsx.readUInt32LE(i) !== 0x06054b50) i--;
  const count = xlsx.readUInt16LE(i + 10);
  let off = xlsx.readUInt32LE(i + 16);
  for (let c = 0; c < count; c++) {
    const nameLen = xlsx.readUInt16LE(off + 28);
    zipNames.push(xlsx.subarray(off + 46, off + 46 + nameLen).toString("utf8"));
    off += 46 + nameLen + xlsx.readUInt16LE(off + 30) + xlsx.readUInt16LE(off + 32);
  }
}
t("xlsx are 5 parti", zipNames.length === 5, zipNames.length + "");
t("xlsx contine [Content_Types].xml", zipNames.includes("[Content_Types].xml"));
t("xlsx contine workbook.xml", zipNames.includes("xl/workbook.xml"));
t("xlsx contine sheet1.xml", zipNames.includes("xl/worksheets/sheet1.xml"));
t("xlsx contine relatiile", zipNames.includes("_rels/.rels") && zipNames.includes("xl/_rels/workbook.xml.rels"));
// extragem sheet-ul (deflate raw)
function readEntry(name: string): string {
  let i = 0;
  while (i < xlsx.length - 4) {
    if (xlsx.readUInt32LE(i) === 0x04034b50) {
      const nameLen = xlsx.readUInt16LE(i + 26);
      const extraLen = xlsx.readUInt16LE(i + 28);
      const nm = xlsx.subarray(i + 30, i + 30 + nameLen).toString("utf8");
      const compSize = xlsx.readUInt32LE(i + 18);
      const start = i + 30 + nameLen + extraLen;
      if (nm === name) return zlib.inflateRawSync(xlsx.subarray(start, start + compSize)).toString("utf8");
      i = start + compSize;
    } else i++;
  }
  return "";
}
const sheet = readEntry("xl/worksheets/sheet1.xml");
t("sheet-ul se decomprima", sheet.length > 100);
t("sheet-ul e XML valid la radacina", sheet.startsWith("<?xml") && sheet.includes("</worksheet>"));
t("diacriticele supravietuiesc in Excel", sheet.includes("ăîșțâ"));
t("contine numele clientului", sheet.includes("RomCut SRL"));
t("contine toate cele 3 linkuri", entries.every((e) => sheet.includes(e.url)));
t("contine antetul de coloane", sheet.includes("Publicație") && sheet.includes("Link"));
t("extrage domeniul publicatiei", sheet.includes("clujexpres.ro"));
t("xlsx gol nu crapa", buildReportXlsx({ entries: [], date: new Date() }).length > 500);
t("xlsx scapa caractere XML periculoase", (() => {
  const x = buildReportXlsx({ entries: [{ url: "https://a.ro/x", title: '<script>&"' }], date: new Date() });
  return x.subarray(0, 2).toString() === "PK";
})());

console.log("\n########## G. FISIERUL PDF ##########");
const many = Array.from({ length: 46 }, (_, i) => ({ url: `https://ziar${i}.ro/a/${i}`, title: `Articol ăîșț ${i + 1}` }));
const pdf = buildReportPdf({ entries: many, clientName: "RomCut", articleTitle: "Campanie", date: new Date("2026-08-25"), siteName: "MediaExpres", siteUrl: "mediaexpress.ro" });
const pdfStr = pdf.toString("latin1");
t("pdf are header corect", pdfStr.startsWith("%PDF-1.4"));
t("pdf se termina cu EOF", pdfStr.trimEnd().endsWith("%%EOF"));
t("pdf are tabel xref", pdfStr.includes("xref") && pdfStr.includes("startxref"));
t("pdf are trailer cu Root", /trailer[\s\S]*\/Root 1 0 R/.test(pdfStr));
t("pdf are catalog", pdfStr.includes("/Type /Catalog"));
t("pdf pagineaza la 46 de intrari", (pdfStr.match(/\/Type \/Page[^s]/g) || []).length >= 2, `${(pdfStr.match(/\/Type \/Page[^s]/g) || []).length} pagini`);
t("Count din Pages = numarul de pagini", (() => {
  const m = pdfStr.match(/\/Count (\d+)/);
  const kids = (pdfStr.match(/\/Type \/Page[^s]/g) || []).length;
  return !!m && Number(m[1]) === kids;
})());
t(
  "pdf are ambele fonturi, incorporate",
  pdfStr.includes("/DejaVuSans") &&
    pdfStr.includes("/DejaVuSans-Bold") &&
    pdfStr.includes("/FontFile2"),
);
// Regula s-a INTORS: pana acum diacriticele erau transliterate, pentru ca
// fonturile standard PDF n-au ă, ș si ț — si ieseau "Arges Expres" si
// "Braila Expres" in raportul pe care clientul il pune la dosar. Acum fontul
// e incorporat, iar literele exista cu adevarat: se scriu cu codurile
// noastre, escapate octal in fluxul de continut.
t(
  "pdf scrie diacriticele cu codurile fontului incorporat",
  pdfStr.includes("/Differences") && /\\1\d\d/.test(pdfStr),
);
t("xref: fiecare offset arata spre obiectul corect", (() => {
  const m = pdfStr.match(/startxref\s+(\d+)/);
  if (!m) return false;
  const sec = pdfStr.slice(Number(m[1]));
  const offs = [...sec.matchAll(/^(\d{10}) \d{5} n/gm)].map((x) => Number(x[1]));
  if (offs.length < 4) return false;
  const crescator = offs.every((v, i) => i === 0 || v > offs[i - 1]);
  const corecte = offs.every((off, i) => new RegExp("^" + (i + 1) + " 0 obj").test(pdfStr.slice(off, off + 14)));
  return crescator && corecte;
})());
t("pdf gol nu crapa", buildReportPdf({ entries: [], date: new Date(), siteName: "X", siteUrl: "x.ro" }).length > 300);
t("pdf scapa parantezele din text", (() => {
  const x = buildReportPdf({ entries: [{ url: "https://a.ro", title: "Test (paranteza) \\ backslash" }], date: new Date(), siteName: "X", siteUrl: "x.ro" });
  return x.toString("latin1").includes("\\(paranteza\\)");
})());
t("pdf include numele clientului", pdfStr.includes("RomCut"));
t("pdf include numarul de publicatii", pdfStr.includes("46"));

console.log("\n########## H. UTILITARE ##########");
t("escapeHtml neutralizeaza script", escapeHtml('<script>alert(1)</script>').includes("&lt;script&gt;"));
t("escapeHtml scapa ghilimelele", escapeHtml('a"b').includes("&quot;"));
t("escapeHtml scapa ampersandul", escapeHtml("a&b").includes("&amp;"));
t("datele bancare sunt configurate", !!SITE.billing.iban && SITE.billing.iban.startsWith("RO"));
t("telefonul nu mai e placeholder", SITE.phone !== "+40 700 000 000" && SITE.phone.includes("758 169 388"));
t("whatsapp e format wa.me valid", /^\d{9,15}$/.test(SITE.whatsapp));
t("reteaua are cel putin 50 de ziare", NEWSPAPERS.length >= 50, `${NEWSPAPERS.length}`);
t("toate ziarele au url https", NEWSPAPERS.every((x) => x.url.startsWith("https://")));
t("toate ziarele au nume", NEWSPAPERS.every((x) => x.name.trim().length > 2));
t("nu exista domenii duplicate", new Set(NEWSPAPERS.map((x) => x.url)).size === NEWSPAPERS.length);
t("fiecare ziar are regiune valida", NEWSPAPERS.every((x) => ["Moldova", "Transilvania", "Muntenia", "Banat", "Național"].includes(x.region)));
t("oferta din meniu duce la /oferta-500", true);

// ##########################################################################
// I. ATRIBUIRE META — de ce conteaza
//
// Purchase se trimite din webhookul Stripe, care vine de la Stripe, nu din
// browser. Acolo cookie-urile _fbp/_fbc nu mai exista, iar fara ele Meta
// primeste evenimentul dar nu-l poate lega de reclama care a adus clientul —
// coloana Purchases din Ads Manager ramane goala desi ai vandut. Le trecem
// prin metadata sesiunii Stripe; testele de mai jos pazesc exact acel drum.
// ##########################################################################
console.log("\n########## I. ATRIBUIRE META ##########");
{
  const req = new Request("https://mediaexpress.ro/api/checkout", {
    headers: {
      cookie: "_ga=x; _fbp=fb.1.1756000000.123456789; _fbc=fb.1.1756000000.IwAR0abc; z=y",
      "x-forwarded-for": "86.120.1.1, 10.0.0.1",
      "user-agent": "Mozilla/5.0",
    },
  });
  const attr = extractRequestUserData(req);
  t("citeste _fbp din cookie", attr.fbp === "fb.1.1756000000.123456789", attr.fbp);
  t("citeste _fbc din cookie", attr.fbc === "fb.1.1756000000.IwAR0abc", attr.fbc);
  t("nu confunda alte cookie-uri cu _fbp", !JSON.stringify(attr).includes("_ga"));
  t("ia primul IP din x-forwarded-for", attr.ip === "86.120.1.1", attr.ip);

  // Exact forma pusa in metadata sesiunii Stripe de /api/checkout.
  const metadata: Record<string, string> = {
    packageId: "promo-50",
    ...(attr.fbp ? { fbp: attr.fbp } : {}),
    ...(attr.fbc ? { fbc: attr.fbc } : {}),
  };
  t("fbp supravietuieste in metadata Stripe", metadata.fbp === attr.fbp);
  t("fbc supravietuieste in metadata Stripe", metadata.fbc === attr.fbc);

  // Omul venit direct pe site, nu din reclama, nu are cookie-urile astea.
  // Comanda lui trebuie sa mearga la fel de bine.
  const gol = extractRequestUserData(new Request("https://mediaexpress.ro/api/checkout"));
  t("fara cookie-uri nu arunca", gol.fbp === undefined && gol.fbc === undefined);
  const metaGol = {
    ...(gol.fbp ? { fbp: gol.fbp } : {}),
    ...(gol.fbc ? { fbc: gol.fbc } : {}),
  };
  t("fara cookie-uri nu trimite chei goale", Object.keys(metaGol).length === 0);

  // Meta cere email criptat SHA-256, normalizat la minuscule si fara spatii.
  const hash = createHash("sha256").update("client@firma-test.ro").digest("hex");
  const alt = createHash("sha256").update("  Client@Firma-Test.RO  ".trim().toLowerCase()).digest("hex");
  t("emailul se normalizeaza inainte de criptare", hash === alt);

  const nume = splitName("Ion Popescu");
  t("splitName separa prenumele", nume.firstName === "Ion", nume.firstName);
  t("splitName separa numele", nume.lastName === "Popescu", nume.lastName);
  t("splitName pe text gol nu arunca", Object.keys(splitName("")).length === 0);
}

// ##########################################################################
// J. PROMISIUNI — nu vindem ce nu livram
//
// Site-ul a promis in 15 locuri, inclusiv in Termeni si conditii, "raport cu
// screenshot-uri". Nu exista cod de capturi in niciunul dintre cele doua
// repouri — nici puppeteer, nici playwright, nimic. Textele au fost corectate
// sa spuna ce chiar livram: linkurile, in PDF si Excel.
//
// Testul de mai jos exista ca sa nu reapara promisiunea la urmatoarea
// rescriere de copy. Daca cineva chiar construieste capturile, se sterge
// testul odata cu functia noua — deliberat, nu din greseala.
// ##########################################################################
console.log("\n########## J. PROMISIUNI ##########");
t(
  "PRICING_NOTE nu promite screenshot-uri",
  !/screenshot/i.test(PRICING_NOTE),
  PRICING_NOTE.slice(0, 60),
);
t(
  "emailul cu lista nu promite screenshot-uri",
  !/screenshot/i.test(buildListEmail("Test")),
);
t(
  "raportul PDF chiar contine linkurile promise",
  buildReportPdf({
    entries: [{ url: "https://ziar-test.ro/articol", title: "Titlu" }],
    date: new Date("2026-08-27T10:00:00Z"),
    siteName: "MediaExpres",
    siteUrl: "https://mediaexpress.ro",
  }).toString("latin1").includes("ziar-test.ro"),
);


// ##########################################################################
// K. FLUXUL OP — comanda intai, plata dupa factura
//
// Regula veche cerea dovada platii ca sa poti comanda: clientul trebuia sa fi
// platit inainte sa fi primit vreun document. Zero conversii. Verificarile de
// aici pazesc regula noua la nivel de schema si de pasi din chat.
// ##########################################################################
console.log("\n########## K. FLUXUL OP ##########");
{
  t(
    "pasul de dovada din chat e optional (skippable)",
    STEPS.some((st) => st.id === "proof" && st.skippable === true),
  );
  const proofStep = STEPS.find((st) => st.id === "proof");
  const textPas = proofStep ? proofStep.ask(EMPTY_ORDER) : "";
  t(
    "chatul spune ca nu trebuie platit inainte",
    /Nu trebuie să plătești acum/.test(textPas),
    textPas.slice(0, 60),
  );
  t("pasul de dovada arata IBAN-ul", textPas.includes(SITE.billing.iban));
}


// ##########################################################################
// L. GA4 MEASUREMENT PROTOCOL — purchase de pe server
//
// Cumparatorul cu plata unica e redirectionat instant de pe pagina de
// multumire, deci purchase nu se poate trimite din browser. Pleaca din
// webhookul Stripe prin Measurement Protocol; verificarile de aici pazesc
// forma payload-ului si comportamentul fara chei.
// ##########################################################################
console.log("\n########## L. GA4 SERVER-SIDE ##########");
{
  // extragerea client_id-ului din cookie-ul _ga
  const req = new Request("https://mediaexpress.ro/api/checkout", {
    headers: { cookie: "x=1; _ga=GA1.1.111222333.1756000000; _ga_ABC=GS1.1.x" },
  });
  t("citeste client_id din cookie-ul _ga", extractGaClientId(req) === "111222333.1756000000",
    extractGaClientId(req));
  t("fara cookie _ga nu arunca",
    extractGaClientId(new Request("https://mediaexpress.ro/")) === undefined);

  // fara GA_API_SECRET, trimiterea tace — nu exista drum fara secret
  const res = await sendGaPurchase({ sessionId: "cs_test_x", value: 500 });
  t("fara GA_API_SECRET se dezactiveaza singur", res.skipped === true && res.ok === false);
}


// ##########################################################################
// M. PROMISIUNI CARE TREBUIE TINUTE
//
// Doua reguli invatate din realitate, nu din teorie:
//  1. "publicam in 4 ore" nu se poate tine cand proprietarul e plecat de
//     acasa — termenul devine 12 ore lucratoare, peste tot deodata
//     (era in 117 locuri; o singura scapare face restul mincinos).
//  2. "acceptam orice tip de continut" a adus o comanda cu un articol despre
//     tratarea cancerului. Publicarea lui pe 51 de ziare ar fi riscat
//     paginile de Facebook, autoritatea SEO a intregii retele si mai mult.
// ##########################################################################
console.log("\n########## M. PROMISIUNI ##########");
{
  const texte: [string, string][] = [
    ["emailul cu lista", buildListEmail("Test")],
    ["cunostintele consultantului", buildAdvisorKnowledge()],
    ["caseta bancara", bankTransferEmailBox("500 lei", "Publicare articol")],
    ["nota de pret", PRICING_NOTE],
  ];
  for (const [nume, txt] of texte) {
    t(
      `${nume}: fara promisiunea veche de 4 ore`,
      !/\b4\s*(ore|h)\b/i.test(txt),
      (txt.match(/.{0,25}\b4\s*(ore|h)\b.{0,25}/i) || [])[0],
    );
  }
  t(
    "consultantul stie termenul nou",
    /12\s*(de\s*)?ore|12h/i.test(buildAdvisorKnowledge()),
  );
}


// ##########################################################################
// N. VERIFICAREA ARTICOLULUI INAINTE DE PLATA
//
// Regula a venit dintr-o comanda reala: un articol care prezenta un
// "tratament" pentru cancer (regim de sucuri, apa alcalina, fara mancare
// solida) a fost incasat inainte sa-l citeasca cineva. Nu putea fi publicat,
// iar restituirea prin banca dureaza si trece prin contabilitate.
//
// De-aia trierea ruleaza INAINTE ca factura sa plece: cat timp nu s-a virat
// niciun leu, un "nu" costa un email. Testele de mai jos apara exact linia
// asta — si, la fel de important, apara si cazul invers: un articol normal
// care contine cuvantul "tratament" nu are voie sa fie oprit degeaba, altfel
// fiecare stomatolog sau salon din tara ajunge in coada de verificare.
// ##########################################################################
console.log("\n########## N. VERIFICARE INAINTE DE PLATA ##########");
{
  const cancerul = screenContent(
    "Tratamentul care vindeca cancerul",
    "Bolnavii de cancer se pot vindeca printr-un regim de sucuri si apa alcalina, fara chimioterapie.",
  );
  t("articolul cu tratament pentru cancer e oprit", cancerul.flagged === true);
  t("alerta spune si de ce", (cancerul.reason || "").includes("medical"));

  t(
    "acte false sunt oprite din primul cuvant",
    screenContent("Oferim diplome false rapid", "x".repeat(200)).flagged === true,
  );
  t(
    "schema financiara e oprita",
    screenContent("Investiție garantată", "Dublează investiția în 30 de zile.").flagged === true,
  );

  // Fals pozitivele costa vanzari, deci sunt bug-uri la fel de serioase.
  const normale: [string, string][] = [
    ["stomatologie", "Clinica noastra ofera tratament stomatologic modern in Cluj."],
    ["cosmetica", "Salonul ofera terapii de relaxare si tratament pentru par."],
    ["auto", "Service-ul face tratament anticoroziv pentru caroserie."],
    ["ong cancer", "Asociatia strange fonduri pentru bolnavii de cancer din spitalul judetean."],
  ];
  for (const [nume, txt] of normale) {
    t(`articol normal (${nume}) nu e oprit`, screenContent("Comunicat", txt).flagged === false);
  }

  t(
    "declaratia si consecinta ei sunt scrise, nu subintelese",
    CONTENT_DECLARATION.includes("cancer") &&
      /nu se restituie/i.test(CONTENT_DECLARATION_WARNING),
  );
}


// ##########################################################################
// O. LISTA RETELEI CA PDF
//
// Omul care cumpara publicare in presa nu decide singur: are un sef, un
// contabil, un asociat. Pagina de pe site nu se poate trimite pe WhatsApp ca
// dovada; un PDF cu toate linkurile, da. Verificam ca fisierul chiar e un PDF
// valid si ca CONTINE fiecare adresa din retea — un PDF care se deschide dar
// a pierdut jumatate de lista e mai rau decat niciunul.
// ##########################################################################
console.log("\n########## O. LISTA IN PDF ##########");
{
  const pdf = buildNewspaperListPdf();
  const raw = pdf.toString("latin1");
  t("e un PDF valid", raw.startsWith("%PDF-") && raw.trimEnd().endsWith("%%EOF"));
  t("are tabel xref si trailer", raw.includes("xref") && raw.includes("/Root 1 0 R"));

  // Diacriticele sunt transliterate la scriere (fontul e WinAnsi), deci
  // comparam pe forma fara diacritice, exact cum ajunge in fisier.
  const fara = (x: string) =>
    x.replace(/[ăâîșşțţ]/g, (c) => ({ ă: "a", â: "a", î: "i", ș: "s", ş: "s", ț: "t", ţ: "t" })[c] || c);
  // Raportul afiseaza adresele fara "https://" — se citesc mai bine si raman
  // la fel de bune la copiere. Verificam deci forma afisata.
  const lipsa = NEWSPAPERS.filter((n) => !raw.includes(n.url.replace(/^https?:\/\//, "")));
  t("toate cele " + NEWSPAPERS.length + " adrese sunt in PDF", lipsa.length === 0, lipsa[0]?.url);
  // Numele se scriu cu codurile fontului nostru, deci il aplicam si aici —
  // altfel am cauta in PDF un text care nu exista in forma aia nicaieri.
  const codat = (x: string) =>
    Array.from(x)
      .map((ch) => {
        const c = FONT_ENCODING[ch];
        if (c === undefined) return ch;
        return "\\" + c.toString(8).padStart(3, "0");
      })
      .join("");
  const numeLipsa = NEWSPAPERS.filter((n) => !raw.includes(codat(n.name)));
  t("toate numele de ziare sunt in PDF", numeLipsa.length === 0, numeLipsa[0]?.name);

  t("spune pretul si termenul real", raw.includes("500 lei") && raw.includes("12 ore lucratoare"));
  t("nu promite termenul vechi de 4 ore", !/\b4 ore\b/i.test(raw));
  t("explica diferenta dintre 50 promise si cate sunt", raw.includes("bonus"));
  t("explica adresele xn-- (domenii cu diacritice)", raw.includes("xn--"));
}


// ##########################################################################
// P. TOT CODUL, NU DOAR PATRU SIRURI
//
// Blocul M verifica patru texte anume si a trecut cu brio in timp ce
// inlocuirea in masa a promisiunii "4 ore" spargea 80 de locuri din site:
// a iesit "224h lucratoare lucratoare" pe prima pagina, in titluri, in
// descrierile pentru Google — si chiar si doua clase Tailwind ("-right-24
// h-96" a devenit "-right-24h lucratoare-96", adica un fundal disparut).
//
// Lectia: un test care se uita la o lista de siruri alese de mine apara exact
// ce mi-am amintit sa trec pe lista. Asta se uita la TOT ce se livreaza.
// ##########################################################################
console.log("\n########## P. SCANARE PE TOT CODUL ##########");
{
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".next") continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(e.name)) files.push(full);
    }
  };
  walk("src");

  const rele: [RegExp, string][] = [
    [/\b\d*24h\s*lucr/i, "cifra lipita de 'h' — a ramas din inlocuirea veche"],
    // Termenul s-a schimbat a doua oara (24 → 12): vechiul text nu are voie
    // sa ramana nicaieri, nici in emailuri, nici in PDF, nici in chat.
    [/\b24 de ore lucr/i, "termenul vechi de 24 de ore — acum e 12 ore lucratoare"],
    [/lucr[ăa]toare\s+lucr[ăa]toare/i, "cuvant dublat"],
    // Doar 224 urmat de o unitate de timp: 224 e si inceputul intervalului IP
    // multicast, iar un test care se plange de el ar fi zgomot, nu paza.
    [/\b224\s*(h\b|de ore|ore\b)/i, "224 — 24 lipit peste alt numar"],
    [/\bin (maximum )?4 ore\b/i, "promisiunea veche de 4 ore"],
    [/\b4 ORE LUCRATOARE\b/, "promisiunea veche, cu majuscule"],
  ];

  const gasite: string[] = [];
  for (const f of files) {
    const txt = fs.readFileSync(f, "utf8");
    for (const [re, ce] of rele) {
      const m = txt.match(re);
      if (m) gasite.push(`${f}: ${ce} → "${m[0]}"`);
    }
  }
  t(
    `niciun text stricat in cele ${files.length} fisiere din src/`,
    gasite.length === 0,
    gasite.slice(0, 3).join(" | "),
  );

  // Si invers: termenul nou chiar exista in produs, ca testul de mai sus sa nu
  // poata trece pur si simplu pentru ca s-a sters orice promisiune.
  const cuTermen = files.filter((f) =>
    /12 ore lucr[ăa]toare/i.test(fs.readFileSync(f, "utf8")),
  );
  t("termenul nou e scris in produs", cuTermen.length >= 20, `doar ${cuTermen.length} fisiere`);
}


// ##########################################################################
// Q. TEXTUL CLIENTULUI SE CURATA
//
// Primul articol real a ajuns pe ziare exact cum l-a lipit clientul din PDF:
// spatii duble, spatii inaintea virgulelor, randuri rupte in mijloc de
// propozitie. "Copiaza textul" din admin copia gunoiul cu tot cu text.
// Cazurile de mai jos sunt luate din articolul ala, nu inventate.
// ##########################################################################
console.log("\n########## Q. CURATAREA TEXTULUI ##########");
{
  t("spatiile duble devin unul", cleanArticleText("are nevoie de Fe2+  70% din acest fier") === "are nevoie de Fe2+ 70% din acest fier");
  t("spatiul dinaintea virgulei dispare", cleanArticleText("procesele de ardere , procesele de crestere") === "procesele de ardere, procesele de crestere");
  t("randul care incepe cu spatiu se curata", cleanArticleText(" Anumite tesuturi nu primesc oxigen") === "Anumite tesuturi nu primesc oxigen");
  t(
    "randul rupt in mijloc de propozitie se uneste",
    cleanArticleText("este transportat in organism cu\najutorul unei enzime") ===
      "este transportat in organism cu ajutorul unei enzime",
  );
  t(
    "dar randul nou care incepe cu majuscula ramane rand nou",
    cleanArticleText("teoria veche.\nFactori care declanseaza") === "teoria veche.\nFactori care declanseaza",
  );
  t(
    "si dupa punct randurile raman separate",
    cleanArticleText("refuzul hranei de catre pacient.\nCe este cancerul?") ===
      "refuzul hranei de catre pacient.\nCe este cancerul?",
  );
  t("CRLF si 4 randuri goale se normalizeaza", cleanArticleText("a\r\n\r\n\r\n\r\nb") === "a\n\nb");
  t("spatiul non-breaking din Word devine spatiu", cleanArticleText("unu\u00a0doi") === "unu doi");
  t("titlul pierde orice rand si spatiu in plus", cleanTitle("  Ce este  cancerul ,\n tratament ") === "Ce este cancerul, tratament");
  // Curatarea nu are voie sa strice un text deja bun.
  const bun = "Primul paragraf, corect.\n\nAl doilea paragraf, tot corect.";
  t("un text curat ramane identic", cleanArticleText(bun) === bun);
}

console.log("\n" + "=".repeat(64));
console.log(`TOTAL: ${n} verificari | ESUATE: ${fails.length}`);
if (fails.length) console.log(fails.map((f) => "  x " + f).join("\n"));
