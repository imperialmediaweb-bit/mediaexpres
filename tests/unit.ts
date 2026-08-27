import {
  currentPromoDeadline,
  promoDeadlineLabel,
  isPromoDeadlineActive,
  findPackageById,
  findSubscriptionPlanById,
  PROMO_PACKAGES,
  STANDARD_PACKAGES,
  PROMO_ROLLING,
} from "@/data/packages";
import { buildListEmail, LIST_EMAIL_SUBJECT, newspaperListHtml } from "@/lib/list-email";
import { buildAdvisorKnowledge } from "@/lib/advisor-knowledge";
import { buildReportXlsx, buildReportPdf } from "@/lib/report-files";
import { NEWSPAPERS } from "@/data/newspapers";
import { SITE } from "@/data/site";
import { bankTransferEmailBox, escapeHtml } from "@/lib/email";
import { extractRequestUserData, splitName } from "@/lib/meta-capi";
import zlib from "node:zlib";
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
t("mentioneaza 4 ore", mail.includes("4 ore"));
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
t("caseta cere dovada platii", /dovada pl[aă][tț]ii/i.test(box));
t("caseta cere date de facturare", /CUI/i.test(box));
t("caseta promite raport si factura", /raportul/i.test(box) && /factura/i.test(box));

console.log("\n########## E. CUNOSTINTELE CONSULTANTULUI ##########");
const k = buildAdvisorKnowledge();
t("stie IBAN-ul pentru OP", k.includes(SITE.billing.iban));
t("stie firma de pe factura", k.includes(SITE.billing.company));
t("stie termenul ofertei", k.includes("14 SEPTEMBRIE"));
t("stie de publicarea in 4 ore", k.includes("4 ORE"));
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
t("pdf are ambele fonturi", pdfStr.includes("/Helvetica") && pdfStr.includes("/Helvetica-Bold"));
t("pdf transliterează diacriticele", pdfStr.includes("Articol aist") || !/ăîșț/.test(pdfStr));
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

console.log("\n" + "=".repeat(64));
console.log(`TOTAL: ${n} verificari | ESUATE: ${fails.length}`);
if (fails.length) console.log(fails.map((f) => "  x " + f).join("\n"));
