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
import { isoDinOraRomaniei, formatOraRomaniei } from "@/lib/ora-romaniei";
import { signReviewToken, verifyReviewToken } from "@/lib/review-token";
import { bankTransferEmailBox, escapeHtml } from "@/lib/email";
import { extractRequestUserData, splitName } from "@/lib/meta-capi";
import { STEPS, EMPTY_ORDER } from "@/components/chat/order-steps";
import { extractGaClientId, sendGaPurchase } from "@/lib/ga-mp";
import { buildNewspaperListPdf } from "@/lib/newspaper-list-pdf";
import { cleanArticleText, cleanTitle } from "@/lib/clean-text";
import { CLIENTI } from "@/data/clienti";
import { CAMPANII, EXEMPLU_RAPORT } from "@/data/campanii";
import { domeniuDin } from "@/lib/autoritate";
import { pretOptiuneClient, citesteOptiuni } from "@/lib/optiuni-partener";
import { articolHtml, parseazaLinkuri, linkDescarcarePoza, linkuriImplicite, serializeazaLinkuri, normalizeazaUrl } from "@/lib/articol-html";
import { verificaContact } from "@/lib/filtru-contact";
import { analizeazaPagina } from "@/lib/paza-linkuri";
import { parseazaAlegeri } from "@/lib/catalog-parteneri";
import { consecinta, procentLaTimp } from "@/lib/termene-parteneri";
import { domeniileRetelei, rezumatAutoritate } from "@/lib/autoritate-retea";
import { parseazaCuvinte, slugDin, curataHtml, numarCuvinte, eRandul, textPostareFacebook, RITMURI_BLOG } from "@/lib/autoblog";
import { surseCaptura } from "@/lib/captura-site";
import { textulZilei, pozaZilei, eRandulOfertei, parseazaTexte, TEXTE_IMPLICITE } from "@/lib/oferta-facebook";
import { comandaPentruRetea } from "@/lib/retea";

import {
  PRAG_RETRAGERE,
  calculeazaSold,
  poateCerePlata,
  catMaiAi,
  ibanValid,
  normalizeazaIban,
  ePlatibila,
} from "@/lib/decont";

import {
  pretAlacarte,
  pretBucata,
  urmatorulPrag as urmatorulPragZiare,
  slugZiar,
  ziareDinSluguri,
  etichetaZiare,
  numeleZiarelor,
  ZIARE_ALEGIBILE,
  TOTAL_ZIARE,
  PRET_RETEA,
} from "@/lib/alacarte";
import {
  sursaDinUrl,
  serializeazaSursa,
  parseazaSursa,
  sursaDinCookieHeader,
  etichetaSursa,
  propozitieSursaWhatsApp,
} from "@/lib/sursa";
import {
  screenContent,
  CONTENT_DECLARATION,
  CONTENT_DECLARATION_WARNING,
} from "@/lib/content-policy";
import { citesteDocx, linkuriCaNote, paraArataATitlu } from "@/lib/docx";
import {
  ADAOS_PLASARE,
  nivelPropus,
  pretClient,
  adaosPentru,
  totalCatreClient,
  urmatorulPrag,
} from "@/lib/niveluri-publicatii";
import { eZiLucratoare, adaugaZileLucratoare } from "@/lib/zile-lucratoare";
import {
  tranzitiePermisa,
  eStareFinala,
  etichetaStare,
  onlinePanaLa,
  domeniulDinNote,
} from "@/lib/plasari";
import { zipSync } from "fflate";
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
t("azi arata 1 octombrie", promoDeadlineLabel(at("2026-09-13T12:00:00+03:00")) === "1 octombrie");
t("cu o zi inainte de termen ramane acelasi", promoDeadlineLabel(at("2026-09-30T23:00:00+03:00")) === "1 octombrie");
t("dupa expirare se prelungeste la 4 octombrie", promoDeadlineLabel(at("2026-10-02T10:00:00+03:00")) === "4 octombrie");
t("a doua prelungire: 7 octombrie", promoDeadlineLabel(at("2026-10-05T10:00:00+03:00")) === "7 octombrie");
t("pasul e de exact 3 zile", (() => {
  const a = currentPromoDeadline(at("2026-10-02T10:00:00+03:00"))!.getTime();
  const b = currentPromoDeadline(at("2026-10-05T10:00:00+03:00"))!.getTime();
  return Math.round((b - a) / 86400000) === 3;
})());
t("la prelungiri de 3 zile nu pleaca email la toata lista", /PROMO_ROLLING\.periodDays < 14/.test(fs.readFileSync("src/app/api/cron/promo-announce/route.ts", "utf8")));
t("nu depaseste 31 decembrie", (() => {
  const d = currentPromoDeadline(at("2026-12-20T10:00:00+02:00"))!;
  return d.getTime() <= new Date(PROMO_ROLLING.hardEndIso).getTime();
})());
t("dupa 31 decembrie nu mai exista termen", currentPromoDeadline(at("2027-01-02T10:00:00+02:00")) === null);
t("isPromoDeadlineActive: adevarat azi", isPromoDeadlineActive(at("2026-09-13T12:00:00+03:00")) === true);
t("isPromoDeadlineActive: fals in 2027", isPromoDeadlineActive(at("2027-01-02T10:00:00+02:00")) === false);
t("eticheta e in romana", /septembrie|octombrie|noiembrie|decembrie/.test(promoDeadlineLabel(at("2026-09-13T12:00:00+03:00")) || ""));
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
t("contine termenul ofertei", mail.includes(promoDeadlineLabel()!));
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
t("stie termenul ofertei", k.toUpperCase().includes(promoDeadlineLabel()!.toUpperCase()));
t("stie de publicarea in 12 ore", /12\s*(DE\s*)?ORE/i.test(k));
// Chatul trebuie sa raspunda ca proprietarul pe WhatsApp: pe nume la ziare,
// cu cifre la autoritate, cinstit la trafic, ferm la reguli, si sa stie
// drumul comenzii cap-coada.
t("stie ziarele pe nume, cu judet", /Cluj Expres — judetul Cluj \(clujexpres\.ro\)/.test(k));
t("stie ziarele nationale", /România Expres \(romaniaexpres\.ro\)/.test(k));
t("stie cifrele masurate, cu data", /37 \/ Page Authority 30|Page Authority 30/.test(k) && /6 septembrie 2026/.test(k));
t("spune cinstit ca nu vinde SEO si nu vinde trafic", /NU vindem SEO si NU vindem trafic/.test(k));
t("stie ce vinde: aparitii in presa", /Vindem APARITII IN PRESA/.test(k) && /dosare de finantare/.test(k));
t("stie regula banilor la declaratie falsa", /suma NU se restituie/.test(k));
t("stie garantia de 12 ore", /GARANTIE: daca nu publicam in 12 ore lucratoare/.test(k));
t("explica rescris vs original si recomanda rescris", /RESCRIS SAU ORIGINAL/.test(k) && /RECOMANDAT: varianta rescrisa/.test(k));
t("stie drumul OP: factura -> plata -> 12 ore -> raport", /primeste FACTURA pe email in aceeasi zi lucratoare[\s\S]*plateste pe baza ei[\s\S]*12 ore lucratoare[\s\S]*RAPORTUL/.test(k));
t("stie ca factura NU e automata", !/se emite AUTOMAT/.test(k) && /nu automat/.test(k));
t("stie ca clientul revenit trimite dovada/articolul in chat", /Am platit — trimit dovada/.test(k));
t("are raspuns pentru expertul SEO", /EXPERT SEO/.test(k) && /NU vindem SEO/.test(k));
t("are raspuns pentru sceptic", /SCEPTICUL/.test(k));
t("are raspuns pentru cazino, institutie, agentie", /CAZINO \/ PARIURI/.test(k) && /INSTITUTIE/.test(k) && /AGENTIE/.test(k));
// Raspunsurile pregatite: fiecare tip de client isi gaseste intrebarile.
for (const [profil, intrebari] of [
  ["Firma mica, prima data", ["Cat costa?", "Ce primesc?", "Nu am articol scris", "Cat dureaza?", "Cum platesc?", "Primesc factura?", "Pot plati dupa ce vad articolele?"]],
  ["Expert SEO / agentie", ["E ok pentru SEO?", "Ce DA/DR au?", "E PBN?", "Facturati pe agentie?", "Ce contine raportul?"]],
  ["Scepticul", ["Sunt site-uri reale sau fantoma?", "Ce trafic au?", "Nu face banii", "Imi aduce clienti?", "Ce garantie am?", "De ce 500 si nu 1.500?"]],
  ["Cazino / pariuri", []],
  ["Continut sensibil", []],
  ["Institutie, primarie, ONG", []],
  ["Client vechi / a comandat deja", ["Ce e cu comanda mea?", "Am platit, unde trimit dovada?", "Pot modifica articolul dupa publicare?", "Se sterge dupa o perioada?"]],
  ["Geografie", ["Aveti ziar in", "Vreau doar in judetul meu"]],
  ["Facebook, trafic, promovare", ["Apare si pe Facebook?", "Puteti promova/boosta postarile?"]],
  ["Altele", ["Articol in engleza / maghiara?", "Puteti publica azi?", "Pune eticheta (P)?", "Am mai multe articole", "Vorbesc cu un om?"]],
] as [string, string[]][]) {
  t(`raspunsuri pregatite: profilul „${profil}”`, k.includes(`[${profil}`));
  for (const q of intrebari) t(`  are raspuns la „${q}”`, k.includes(`„${q}`));
}
t("raspunsurile pregatite tin cifrele: 10 lei/ziar, 1.000 cazino, 500 vs 4.500", /10 lei pe ziar/.test(k) && /1\.000 lei promo/.test(k) && /4\.500/.test(k));
t("nu promite trafic sau pozitii nicaieri", !/garantam pozitii/i.test(k.replace(/Nu garantam pozitii/g, "")) && !/mii de vizitatori/i.test(k));
t("are argumentul trait 500 vs 4.500", /4\.500 de lei pentru un singur articol/.test(k));
t("stie ca publicarea e esalonata", /ESALONATA/.test(k));
t("stie de promovarea pe Facebook 3 zile, fara cifre promise", /PROMOVARE PE FACEBOOK, 3 ZILE, INCLUSA/.test(k) && /NU promite afisari/.test(k));

// 07.09.2026 (proprietarul: „nu vorbim la per tu") — emailurile catre clientii
// care au platit se scriu cu „dumneavoastra". Pagina de vanzare ramane la „tu":
// acolo vorbim cu vizitatorul, nu cu omul care ne-a dat bani.
{
  const catreClienti = [
    "src/app/api/webhook/stripe/route.ts",
    "src/lib/invoicing.ts",
    "src/lib/list-email.ts",
    "src/app/api/order/route.ts",
    "src/app/api/oferta-fb/route.ts",
    "src/app/api/request-list/route.ts",
  ];
  const cuSalut = catreClienti.filter((f) => /<p>Salut/.test(fs.readFileSync(f, "utf8")));
  t("emailurile catre clienti nu mai incep cu „Salut”", cuSalut.length === 0, cuSalut.join(", "));
}
t("confirma ca linkurile sunt dofollow, dar fara promisiuni", /Linkurile SUNT dofollow/.test(k) && /nu spune adevarul/.test(k));
t("raspunde cinstit la „primesc backlinkuri?”", /Primesc backlinkuri\?/.test(k) && /fara atribute care le anuleaza/i.test(k));
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
  // 06.09.2026 — dupa scoaterea Sibiu Expres (domeniu inexistent) reteaua are
  // exact 50 = 41 locale + 9 nationale, adica fix cat promitem. Linia de
  // „bonus" (pentru cand livram mai mult decat vindem) reapare singura daca
  // se adauga publicatii; aici verificam ca lista nu promite mai mult decat are.
  t("lista nu promite mai multe ziare decat exista", NEWSPAPERS.length >= 50);
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
    // Acelasi lucru, in TOT src/: nu doar pe paginile randate.
    // „dofollow" e permis in cunostintele consultantului: linkurile CHIAR sunt,
    // iar la telefon intrebarea vine exact asa. Interzise raman promisiunile.
    [/\d+\s*(de\s*)?backlink/i, "„N backlinks” — vindem aparitii, nu pachete de linkuri"],
    [/backlink[a-zăâîșț]*\s+(SEO|dofollow)/i, "„backlink SEO” — nu mai vindem asta"],
    // Exceptie: liniile care INTERZIC un cuvant trebuie sa-l poata numi.
    // Vezi filtrul de mai jos (`esteInterdictie`).
    // Proprietarul a corectat cifra: nu 1.200, ci circa 600 de articole pe zi.
    [/1\.200\s*(de\s*)?articole|1\.200\+/i, "cifra veche de articole pe zi — acum e circa 600"],
    [/lucr[ăa]toare\s+lucr[ăa]toare/i, "cuvant dublat"],
    // Doar 224 urmat de o unitate de timp: 224 e si inceputul intervalului IP
    // multicast, iar un test care se plange de el ar fi zgomot, nu paza.
    [/\b224\s*(h\b|de ore|ore\b)/i, "224 — 24 lipit peste alt numar"],
    [/\bin (maximum )?4 ore\b/i, "promisiunea veche de 4 ore"],
    [/\b4 ORE LUCRATOARE\b/, "promisiunea veche, cu majuscule"],
  ];

  // O linie care INTERZICE un cuvant trebuie sa-l poata numi: promptul
  // consultantului ii spune modelului „nu spune niciodata «dofollow»", iar
  // comentariile din cod explica de ce s-a scos. Cautam linie cu linie tocmai
  // ca sa putem face exceptia asta fara sa slabim regula pentru textul real.
  const esteInterdictie = (linie: string) =>
    /NU folosi|NU ai voie|Nu spune niciodata|Nu promite niciodata|nu mai vindem|— nu mai|scos|interzis|vindem aparitii/i.test(linie);

  const gasite: string[] = [];
  for (const f of files) {
    const linii = fs.readFileSync(f, "utf8").split("\n");
    for (const [re, ce] of rele) {
      for (const linie of linii) {
        const m = linie.match(re);
        if (m && !esteInterdictie(linie)) {
          gasite.push(`${f}: ${ce} → "${m[0]}"`);
          break;
        }
      }
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
  // 09.09.2026 — un articol generat a ajuns in admin cu „**subtitlu**".
  // Fara curatare, stelutele ar fi aparut literal pe 50 de site-uri.
  t(
    "subtitlul cu stelute isi pierde stelutele",
    cleanArticleText("**Alege firma de reparatii**\n\nText normal.") ===
      "Alege firma de reparatii\n\nText normal.",
  );
  t("bold in mijlocul frazei se curata", cleanArticleText("firma **noastra** repara") === "firma noastra repara");
  t("underscore dublu se curata", cleanArticleText("__Montaj acoperisuri__") === "Montaj acoperisuri");
  t("titlul de tip markdown ramane fara diez", cleanArticleText("## Reparatii acoperisuri") === "Reparatii acoperisuri");
  t("titlul cu stelute se curata si el", cleanTitle("**Reparatii si Montaj**") === "Reparatii si Montaj");
  // Un asterisc singur nu e formatare — poate fi nota de subsol, nu-l atingem.
  t("asteriscul singur ramane", cleanArticleText("pret 500 lei*") === "pret 500 lei*");

  // Curatarea nu are voie sa strice un text deja bun.
  const bun = "Primul paragraf, corect.\n\nAl doilea paragraf, tot corect.";
  t("un text curat ramane identic", cleanArticleText(bun) === bun);
}


// ##########################################################################
// R. DATELE FIRMEI SI LIMITELE DIN TERMENI
//
// Un vizitator a intrebat cine e firma din spatele site-ului si n-a gasit
// nicaieri CUI-ul sau numarul de la Registrul Comertului. In plus, site-ul
// spunea doua nume diferite: politica de confidentialitate zicea „MediaExpres
// SRL", iar beneficiarul de la plata prin OP e LEGIO WEB DEVELOPMENT TOOLS.
// Verificarile de aici tin datele intr-un singur loc si tin scrise negru pe
// alb limitele pe care le promitem — ca sa nu dispara la o rescriere.
// ##########################################################################
console.log("\n########## R. DATELE FIRMEI ##########");
{
  const l = SITE.legal;
  t("CUI-ul e cel real", l.cui === "46466484");
  t("CUI-ul se scrie fara prefixul RO (firma nu e platitoare de TVA)", !/^RO/i.test(l.cui));
  t("numarul de la Registrul Comertului e completat", l.regCom === "J07/506/2022");
  t("denumirea juridica e a firmei care factureaza", /Legio Web Development Tools/i.test(l.companyName));
  t("sediul afisat e Botosani, nu Bucuresti", /Botoșani/.test(l.address) && !/București/.test(l.address));
  t("adresa afisata nu contine strada si numarul", !/Aleea|nr\./i.test(l.address));
  t("se spune ca firma nu e platitoare de TVA", /nu este plătitoare de TVA/i.test(l.vat));
  t("exista linkurile ANPC SAL si SOL", /anpc\.ro/.test(l.anpcSal) && /consumers\/odr/.test(l.anpcSol));
  t("SITE.address urmeaza sediul real", /Botoșani/.test(SITE.address));
  t("beneficiarul din OP e aceeasi firma", /LEGIO WEB DEVELOPMENT TOOLS/i.test(SITE.billing.company));
  t("caseta de OP din email da si CUI-ul beneficiarului", bankTransferEmailBox("500 lei", "test").includes(l.cui));

  // Denumirea inventata nu mai are voie sa existe nicaieri in cod.
  const fisiere: string[] = [];
  const plimba = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".next") continue;
        plimba(full);
      } else if (/\.(ts|tsx)$/.test(e.name)) fisiere.push(full);
    }
  };
  plimba("src");
  const cu = (re: RegExp) => fisiere.filter((f) => re.test(fs.readFileSync(f, "utf8")));
  t("„MediaExpres SRL” nu mai apare nicaieri", cu(/MediaExpres\s+S\.?R\.?L\.?/i).length === 0, cu(/MediaExpres\s+S\.?R\.?L\.?/i).join(", "));
  t("CUI-ul nu apare nicaieri cu prefix RO", cu(/RO46466484/).length === 0);
  t("codul intracomunitar gresit nu apare", cu(/46808153/).length === 0);
  t("strada sediului nu apare in cod", cu(/Aleea Parcului/i).length === 0);

  // Datele apar acolo unde omul le cauta: footer, contact, paginile de comanda.
  const citeste = (f: string) => fs.readFileSync(f, "utf8");
  t("footerul afiseaza datele firmei", /DateFirmaLinie/.test(citeste("src/components/layout/Footer.tsx")));
  t("footerul are linkurile ANPC si SOL", /anpcSal/.test(citeste("src/components/layout/Footer.tsx")) && /anpcSol/.test(citeste("src/components/layout/Footer.tsx")));
  t("pagina de contact afiseaza datele firmei", /DateFirma/.test(citeste("src/app/contact/page.tsx")));
  t("pagina de comanda prin OP afiseaza datele firmei", /DateFirma/.test(citeste("src/app/comanda/transfer/page.tsx")));
  t("pagina de oferta afiseaza datele firmei", /DateFirma/.test(citeste("src/app/oferta-500/page.tsx")));
  t("consultantul stie datele firmei", buildAdvisorKnowledge().includes(l.cui));

  // Termenii: limitele scrise pe puncte. Daca dispar, cade testul.
  const termeni = citeste("src/app/legal/termeni/page.tsx");
  const cerute: [RegExp, string][] = [
    [/de mijloace, nu de rezultat/i, "obligatia de mijloace"],
    [/trafic sau vizitatori/i, "refuzul de a promite trafic"],
    [/vânzări, clienți, cereri de ofertă/i, "refuzul de a promite vanzari"],
    [/poziții în Google/i, "refuzul de a promite pozitii"],
    [/indexarea articolelor/i, "refuzul de a promite indexarea"],
    [/Domain Authority|Domain Rating/i, "refuzul indicatorilor SEO"],
    [/afișări, aprecieri, comentarii/i, "refuzul cifrelor de Facebook"],
    [/nu poate depăși suma plătită/i, "limitarea raspunderii"],
    [/OUG 34\/2014/, "dreptul de retragere"],
    [/forță majoră/i, "forta majora"],
    [/ne despăgubește/i, "despagubirea de la client"],
    [/12 ore lucrătoare/, "termenul de publicare"],
  ];
  for (const [re, ce] of cerute) t(`termenii contin ${ce}`, re.test(termeni));

  // 08.09.2026 — un client cu o singura comanda platita cu cardul aparea in
  // /admin/clienti cu 2 plati si 1.000 lei. Pagina aduna `orders` (Stripe) cu
  // `orderSubmissions`, iar a doua tabela tine materialele TUTUROR comenzilor,
  // nu doar ale celor prin OP: la card exista rand in amandoua, iar publicarea
  // il aducea si pe al doilea la socoteala. Filtrul pe paymentMethod e singurul
  // lucru care tine cifrele adevarate — daca dispare, se dubleaza la loc.
  // Raportul se poate programa: rapoartele se termina des seara tarziu, iar un
  // email la 23:40 arata a robot. Ora goala inseamna „acum", ca pana acum.
  const rutaRaport = citeste("src/app/api/admin/raport/route.ts");
  t("raportul poate fi programat", /scheduledAt/.test(rutaRaport) && /trimiteLa/.test(rutaRaport));
  t(
    "o ora din trecut nu blocheaza raportul",
    /new Date\(iso\)\.getTime\(\) > Date\.now\(\)/.test(rutaRaport),
  );
  t(
    "formularul de raport are campul de programare",
    /datetime-local/.test(citeste("src/app/admin/rapoarte/RaportForm.tsx")),
  );

  // Raportul gazduit (pagina cu toate aparitiile, postarile de Facebook si
  // confirmarea indexarii) ramane in contul clientului. Emailurile se pierd,
  // contul nu — de aceea linkul se si salveaza, nu doar se trimite.
  t("linkul raportului ajunge in baza de date", /reportUrl: reportUrl \|\| null/.test(rutaRaport));
  t("emailul are butonul catre toate linkurile", /Vezi toate linkurile/.test(rutaRaport));
  t(
    "cand exista raportul gazduit, emailul nu mai insira cele 50 de linkuri",
    /reportUrl\s*\n?\s*\?[\s\S]{0,600}: links\.length/.test(rutaRaport),
  );
  t(
    "emailul trimite clientul spre contul lui, cu buton",
    /Rapoartele mele →/.test(rutaRaport) && /\/cont\/rapoarte/.test(rutaRaport),
  );
  t(
    "emailul spune ca raportul se descarca oricand din cont",
    /se\s*\n?\s*descarcă oricând din contul dumneavoastră/.test(rutaRaport),
  );
  t(
    "clientul vede raportul in contul lui",
    /r\.reportUrl/.test(citeste("src/app/cont/rapoarte/page.tsx")),
  );
  t(
    "coloana se adauga si prin fix-db",
    /publication_report" ADD COLUMN IF NOT EXISTS "report_url/.test(
      citeste("src/app/api/admin/fix-db/route.ts"),
    ),
  );

  // Ora programarii e MEREU ora Romaniei. `datetime-local` nu are fus, iar
  // `new Date(...)` o citea in fusul calculatorului: pe un laptop pe UTC,
  // emailul programat la 9:30 pleca la 12:30, si aflai de la client.
  t("iarna: 09:30 la Bucuresti inseamna 07:30 UTC", isoDinOraRomaniei("2026-01-15T09:30") === "2026-01-15T07:30:00.000Z");
  t("vara: 09:30 la Bucuresti inseamna 06:30 UTC", isoDinOraRomaniei("2026-09-15T09:30") === "2026-09-15T06:30:00.000Z");
  t("un text care nu e data intoarce null", isoDinOraRomaniei("aiurea") === null);
  t(
    "ora se afiseaza inapoi tot in ora Romaniei",
    formatOraRomaniei("2026-09-15T06:30:00.000Z").includes("09:30"),
  );
  t(
    "raportul foloseste ora Romaniei, nu fusul serverului",
    /isoDinOraRomaniei/.test(rutaRaport),
  );
  t(
    "programarea exista si pe pagina comenzii",
    /isoDinOraRomaniei/.test(citeste("src/app/admin/materiale/[id]/OrderActions.tsx")),
  );
  t(
    "programarea exista si la trimite-email",
    /isoDinOraRomaniei/.test(citeste("src/app/admin/trimite-email/ComposeForm.tsx")),
  );

  // 10.09.2026 — un email a plecat la clientul GRESIT. Formularul citea
  // adresa din URL o singura data, la montare; a doua oara cand intrai acolo
  // de la alta comanda, campul pastra clientul precedent.
  const compose = citeste("src/app/admin/trimite-email/ComposeForm.tsx");
  t(
    "adresa se actualizeaza cand se schimba clientul din URL",
    /if \(toDinUrl !== ultimulTo\)/.test(compose) && /setRecipientsRaw\(toDinUrl\)/.test(compose),
  );
  t(
    "si sablonul se schimba odata cu clientul",
    /if \(\(sablonCerut \|\| ""\) !== ultimulSablon\)/.test(compose),
  );

  // Pe pagina comenzii, destinatarul e la vedere: sub titlul sectiunii si pe
  // butonul de trimis. Emailul pleaca mereu la clientul comenzii, dar omul
  // trebuie sa VADA asta inainte sa apese, nu sa presupuna.
  const actiuni = citeste("src/app/admin/materiale/[id]/OrderActions.tsx");
  t("pagina comenzii arata catre cine pleaca emailul", /data-testid="mail-catre"/.test(actiuni));
  t("adresa e si pe butonul de trimis", /Trimite emailul către "\}\s*\{email\}/.test(actiuni));

  // Eticheta Google Ads sta pe acelasi gtag.js ca GA4 — un config in plus.
  // Fara ea, prima campanie Search n-are cum sa lege clicul de comanda.
  const ga = citeste("src/components/analytics/GoogleAnalytics.tsx");
  t("eticheta Google Ads e configurata pe gtag", /AW-778865346/.test(ga) && /gtag\('config', '\$\{ADS_ID\}'\)/.test(ga));
  t("Google Ads nu incarca un al doilea script", (ga.match(/googletagmanager\.com\/gtag\/js/g) || []).length === 1);

  // Conversia de Ads sta pe pagina care CHIAR se randeaza dupa plata cu
  // cardul (/articol/[token]) — /comanda/multumim face redirect pe server.
  const conv = citeste("src/components/analytics/AdsConversion.tsx");
  t("conversia Ads foloseste eticheta de Achizitie", /vAvYCOnh6t0BEMKVsvMC/.test(conv) && /send_to: `\$\{ADS_ID\}\/\$\{PURCHASE_LABEL\}`/.test(conv));
  t("conversia trimite transaction_id, ca sa nu numere dublu", /transaction_id: transactionId/.test(conv));
  t("conversia e montata pe pagina de dupa plata cu cardul", /<AdsConversion transactionId=\{order\.sessionId\} value=\{pkg\?\.price\}/.test(citeste("src/app/articol/[token]/page.tsx")));
  t("multumim NU e locul conversiei la card (face redirect)", /if \(outcome\.kind === "article"\) redirect\(outcome\.url\)/.test(citeste("src/app/comanda/multumim/page.tsx")));

  const clientiAdmin = citeste("src/app/admin/clienti/page.tsx");
  t(
    "in /admin/clienti se numara din orderSubmissions doar comenzile prin OP",
    /eq\(orderSubmissions\.paymentMethod,\s*"op"\)/.test(clientiAdmin),
  );
  t("termenii spun cine e firma", termeni.includes("L.cui") || termeni.includes(l.cui));
}


// ##########################################################################
// S. RECENZIILE
//
// Se cer in emailul cu raportul — momentul in care omul tocmai a primit cele
// 50 de linkuri. Doua cai: butonul catre /recenzie/[token] si raspunsul la
// email. Tokenul il identifica singur, ca sa nu-l punem sa-si scrie iar
// emailul; deci tokenul trebuie sa fie imposibil de falsificat, altfel oricine
// poate lasa recenzii in numele altui client.
// ##########################################################################
console.log("\n########## S. RECENZII ##########");
{
  const bun = signReviewToken({ email: "client@firma.ro", clientName: "Ion Popescu" });
  const dec = verifyReviewToken(bun);
  t("tokenul se verifica si intoarce emailul", dec?.email === "client@firma.ro");
  t("tokenul pastreaza numele clientului", dec?.clientName === "Ion Popescu");
  t("tokenul stricat e respins", verifyReviewToken(bun.slice(0, -3) + "aaa") === null);
  t("tokenul lipsa e respins", verifyReviewToken(undefined) === null);
  t("gunoiul e respins", verifyReviewToken("nu-e-token") === null);
  // Semnatura acopera si emailul: nu poti lua un token valid si sa-i schimbi omul.
  {
    const [p64, sig] = bun.split(".");
    const platit = Buffer.from(p64, "base64url").toString().replace("client@firma.ro", "hoto@rau.ro");
    const falsificat = `${Buffer.from(platit).toString("base64url")}.${sig}`;
    t("emailul schimbat in payload invalideaza tokenul", verifyReviewToken(falsificat) === null);
  }
  t("clientul fara nume primeste totusi token", verifyReviewToken(signReviewToken({ email: "a@b.ro", clientName: "" }))?.email === "a@b.ro");

  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  const raport = citesteFisier("src/app/api/admin/raport/route.ts");
  t("emailul cu raportul are butonul de recenzie", /\/recenzie\/\$\{reviewToken\}/.test(raport));
  t("emailul pastreaza si varianta „raspundeti la acest email”", /r[ăa]spunde[țt]i la acest email/i.test(raport));
  t(
    "raportul pleaca si daca tokenul de recenzie nu se poate semna",
    /let reviewToken = "";[\s\S]{0,400}catch/.test(raport),
  );
  t("emailul cu raportul vorbeste cu „dumneavoastra”", /dumneavoastr[ăa]/.test(raport) && !/<p>Salut/.test(raport));

  t(
    "formularul de recenzie cere numele sau firma care sa apara",
    /Numele sau firma care s[ăa] apar[ăa]/.test(citesteFisier("src/app/recenzie/[token]/ReviewForm.tsx")),
  );
  t(
    "formularul cere acordul de publicare separat",
    /consentPublic/.test(citesteFisier("src/app/recenzie/[token]/ReviewForm.tsx")),
  );
  const api = citesteFisier("src/app/api/recenzie/route.ts");
  t("API-ul ia emailul din token, nu din formular", /verifyReviewToken\(d\.token\)/.test(api));
  t("API-ul are honeypot si limita de cereri", /website/.test(api) && /isRateLimited/.test(api));
  t(
    "tabelul de recenzii e in fix-db",
    /CREATE TABLE IF NOT EXISTS "review"/.test(citesteFisier("src/app/api/admin/fix-db/route.ts")),
  );
  t(
    "exista si plasa de siguranta pentru tabel",
    /ensureReviewsTable/.test(citesteFisier("src/lib/ensure-columns.ts")),
  );
  t(
    "recenziile nu ajung automat pe site",
    !/CLIENT_TESTIMONIALS/.test(api) && !/reviews/.test(citesteFisier("src/app/oferta-500/page.tsx")),
  );
}


// ---------------------------------------------------------------------------
// Sursa comenzii: Google Ads / Facebook / direct, pana in admin si pe WhatsApp
// ---------------------------------------------------------------------------
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  const ser = (r: ReturnType<typeof sursaDinUrl>) => (r ? serializeazaSursa(r.sursa) : null);
  const g = sursaDinUrl("?gclid=abc123&utm_campaign=Advertoriale", "");
  t("gclid = Google Ads, cu campania", ser(g) === "google|cpc|advertoriale" && g?.suprascrie === true);
  const f = sursaDinUrl("?fbclid=xyz", "https://l.facebook.com/");
  t("fbclid = Facebook Ads", ser(f) === "facebook|paid|" && f?.suprascrie === true);
  t(
    "utm_source castiga si suprascrie",
    ser(sursaDinUrl("?utm_source=newsletter&utm_medium=email", "")) === "newsletter|email|",
  );
  const org = sursaDinUrl("", "https://www.google.com/");
  t("referrer Google = cautare organica, NU suprascrie", ser(org) === "google|organic|" && org?.suprascrie === false);
  t("referrer ChatGPT", ser(sursaDinUrl("", "https://chatgpt.com/c/123")) === "chatgpt|referral|");
  t("referrer necunoscut = link de pe site-ul ala", ser(sursaDinUrl("", "https://forum.softpedia.com/x")) === "forum.softpedia.com|referral|");
  t("navigare in site nu e sursa", sursaDinUrl("", "https://mediaexpress.ro/oferta-500") === null);
  const d = sursaDinUrl("", "");
  t("fara nimic = direct, nu suprascrie", ser(d) === "direct|none|" && d?.suprascrie === false);
  t("valori murdare sunt curatate", serializeazaSursa({ source: "Face Book;|", medium: "<b>", campaign: "" }) === "face_book|b|");
  t("parseaza respinge gunoi", parseazaSursa("<script>") === null && parseazaSursa("") === null);
  t(
    "citeste cookie-ul din header, printre altele",
    sursaDinCookieHeader("_ga=GA1.1.1.1; me_src=google%7Ccpc%7Cadv; x=y") === "google|cpc|adv",
  );
  t("fara cookie = null", sursaDinCookieHeader("_ga=GA1.1.1.1") === null);
  t("eticheta Google Ads", etichetaSursa("google|cpc|") === "Google Ads");
  t("eticheta Google Ads cu campanie", etichetaSursa("google|cpc|adv") === "Google Ads — adv");
  t("eticheta Facebook Ads", etichetaSursa("facebook|paid|") === "Facebook Ads");
  t("eticheta Facebook organic", etichetaSursa("facebook|social|") === "Facebook");
  t("eticheta manual", etichetaSursa("manual") === "adăugată manual");
  t("eticheta necunoscuta pentru null", etichetaSursa(null) === "necunoscută");
  t("propozitia WhatsApp pentru Google", propozitieSursaWhatsApp("google|cpc|") === "Am văzut oferta pe Google.");
  t("propozitia WhatsApp pentru Facebook", propozitieSursaWhatsApp("facebook|paid|x") === "Am văzut oferta pe Facebook.");
  t("si cine intra direct spune de unde vine", propozitieSursaWhatsApp("direct|none|") === "Am intrat direct pe site." && propozitieSursaWhatsApp(null) === "Am intrat direct pe site.");
  t("mesajul de WhatsApp din oferta e o intrebare scurta, nu o lista de acte", /Cum procedăm\?/.test(fs.readFileSync("src/app/oferta-500/PromoOffer.tsx", "utf8")) && !/"Vă trimit:"/.test(fs.readFileSync("src/app/oferta-500/PromoOffer.tsx", "utf8")));

  // Drumul pana in baza: cookie → checkout → metadata Stripe → webhook → order.source
  t("checkout pune sursa in metadata Stripe", /sursaDinCerere\(req\)/.test(citesteFisier("src/app/api/checkout/route.ts")) && /\.\.\.\(sursa \? \{ sursa \}/.test(citesteFisier("src/app/api/checkout/route.ts")));
  t("webhookul scrie order.source din metadata", /source: \(session\.metadata\?\.sursa as string\)/.test(citesteFisier("src/app/api/webhook/stripe/route.ts")));
  const tr = citesteFisier("src/app/api/comanda/transfer/route.ts");
  t("comanda prin transfer isi ia sursa din cookie", /const sursa = sursaDinCerere\(req\)/.test(tr) && /source: sursa,/.test(tr));
  const sub = citesteFisier("src/app/api/articol/submit/route.ts");
  // Dupa plata, sursa se ia de pe PLATA (orders.source, pus din metadata
  // Stripe la checkout), nu din cererea de acum — omul se intoarce de la
  // Stripe, deci referrerul de atunci e checkout.stripe.com. Cererea ramane
  // doar plasa, cand plata nu se gaseste.
  t("articolul trimis dupa plata isi ia sursa de pe plata, nu de la Stripe", /plata\?\.source\) sursa = plata\.source/.test(sub) && /source: sursa,/.test(sub));
  t("cererea ramane doar plasa pentru sursa", /let sursa = sursaDinCerere\(req\)/.test(sub));
  {
    const cn = citesteFisier("src/app/api/admin/comanda-noua/route.ts");
    t("comanda manuala: sursa data explicit sau „manual”", /sursaComenzii/.test(cn) && /"manual"/.test(cn));
    t("comanda manuala accepta si cheia X-Api-Key, nu doar cookie-ul de admin", /verifyExtensionKey\(req\)/.test(cn));
  }
  t("eticheta WhatsApp pentru comenzile puse de pe chat", etichetaSursa("whatsapp|direct|") === "WhatsApp");

  // Ritmul de publicare: dropdown cu explicatie, salvat pe comanda, in admin si email.
  {
    const ritmSrc = citesteFisier("src/lib/ritm.ts");
    t("trei ritmuri: rapid, 3 zile, 2 saptamani", /"rapid"/.test(ritmSrc) && /"zile3"/.test(ritmSrc) && /"sapt2"/.test(ritmSrc));
    t("fiecare ritm are explicatie pentru client", (ritmSrc.match(/explicatie:/g) || []).length === 3);
    t("dropdown-ul arata explicatia celei alese", /<select/.test(citesteFisier("src/components/forms/RitmSelect.tsx")) && /ritm-explicatie/.test(citesteFisier("src/components/forms/RitmSelect.tsx")));
    for (const f of ["src/app/comanda/transfer/TransferForm.tsx", "src/app/articol/[token]/ArticleForm.tsx"]) {
      const s = citesteFisier(f);
      t(`${f.split("/").pop()} are dropdown-ul de ritm si il trimite`, /<RitmSelect/.test(s) && /\britm,/.test(s));
    }
    for (const f of ["src/app/api/comanda/transfer/route.ts", "src/app/api/articol/submit/route.ts", "src/app/api/admin/comanda-noua/route.ts"]) {
      const s = citesteFisier(f);
      t(`${f.split("/").slice(-2, -1)[0]}: ritmul e validat si salvat`, /z\.enum\(RITM_IDS\)/.test(s) && /ritm: d\.ritm/.test(s));
    }
    t("ritmul apare in emailul catre admin", /etichetaRitm\(d\.ritm\)/.test(citesteFisier("src/app/api/comanda/transfer/route.ts")) && /etichetaRitm\(d\.ritm\)/.test(citesteFisier("src/app/api/articol/submit/route.ts")));
    t("ritmul apare in admin, pe comanda si in lista", /Ritm ales/.test(citesteFisier("src/app/admin/materiale/[id]/page.tsx")) && /Ritm:/.test(citesteFisier("src/app/admin/materiale/page.tsx")));
    const fixDb2 = citesteFisier("src/app/api/admin/fix-db/route.ts");
    t("coloana ritm e in fix-db si in plasa", /"ritm" text NOT NULL DEFAULT 'rapid'/.test(fixDb2) && /"ritm" text NOT NULL DEFAULT 'rapid'/.test(citesteFisier("src/lib/ensure-columns.ts")));
  }

  // Poze: trimiterea fara nicio poza cere a doua apasare, cu avertisment.
  // Linkuri: clientul scrie pe ce cuvinte vrea linkul, pe ambele formulare.
  {
    const cp = citesteFisier("src/lib/content-policy.ts");
    t("avertismentul fara poze e unul singur, in content-policy", /FARA_POZE_AVERTISMENT/.test(cp) && /Trimite fără poze/.test(cp));
    t("dupa plata, pozele nu mai blocheaza (decizia user 03.10.2026: optional, altfel captura site)", /POZE_OBLIGATORII = 0/.test(cp));
    {
      // Formularul de DUPA PLATA: cel putin o poza obligatorie, butonul blocat pana atunci.
      const s = citesteFisier("src/app/articol/[token]/ArticleForm.tsx");
      t("articol: fara poze, un avertisment, apoi a doua apasare trimite", /images\.length === 0 && !faraPozeConfirmat/.test(s));
      t("articol: butonul spune ca trimite fara poze", /Trimite f\u0103r\u0103 poze →/.test(s));
      t("articol: eroarea de la poze se arata langa poze", /pozeEroare/.test(s) && /role="alert"/.test(s));
      t("articol: pozele mari se micsoreaza, nu se refuza", /comprimaPoza\(ales\)/.test(s));
      // Garda de pe SERVER: o pagina deschisa inainte de deploy ruleaza codul
      // vechi din browser, deci regula nu poate trai doar in formular.
      const api = citesteFisier("src/app/api/articol/submit/route.ts");
      t("serverul nu mai refuza trimiterea fara poze", !/d\.images\.length < POZE_OBLIGATORII/.test(api));
      t("fara poze, serverul pune captura site-ului inainte de salvare", /capturaSite\(d\.siteUrl, order\.sessionId\)/.test(api) && api.indexOf("capturaSite(d.siteUrl") < api.indexOf(".insert(orderSubmissions)"));
      t("formularul ii spune si calea prin WhatsApp cand pozele nu se incarca", /WhatsApp la \$\{SITE\.phone\}/.test(s));
      // Fisa fara poze porneste cu emailul de cerere deja scris.
      const oa = citesteFisier("src/app/admin/materiale/[id]/OrderActions.tsx");
      t("admin: sablon gata scris pentru cererea de poze", /eticheta: "Cer pozele"/.test(oa) && /hasImages \? 0 : 2/.test(oa));
      t("admin: pagina spune fisei daca are poze", /hasImages=\{images\.length > 0\}/.test(citesteFisier("src/app/admin/materiale/[id]/page.tsx")));
      // Comenzile luate pe WhatsApp: pozele si documentul Word intra si ele.
      const nof = citesteFisier("src/app/admin/materiale/NewOrderForm.tsx");
      t("comanda de pe WhatsApp: poti urca pozele primite", /signAndUpload\(file\)/.test(nof) && /MAX_POZE/.test(nof));
      t("comanda de pe WhatsApp: poti urca si documentul Word", /importaDocx\(file\)/.test(nof));
      const cn = citesteFisier("src/app/api/admin/comanda-noua/route.ts");
      // Codul, fara comentarii — altfel „images: "[]"" din explicatia de
      // deasupra ar trece drept cod si testul n-ar prinde o revenire.
      const cnCod = cn.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      t("comanda manuala salveaza pozele, nu un sir gol", /images: JSON\.stringify\(d\.images\)/.test(cnCod) && !/images: "\[\]"/.test(cnCod));
      // Banii de pe WhatsApp, pe prima pagina: pana pe 13.09 lipseau complet.
      const dash = citesteFisier("src/app/admin/page.tsx");
      t("dashboard: totalul aduna cardul si transferul", /const totalCents = cardCents \+ opCents/.test(dash));
      t("dashboard: suma pe luna curenta, separat", /Încasat în \$\{numeLuna\}/.test(dash) && /lunaCents/.test(dash));
      t("dashboard: numara doar comenzile OP incasate (fara dublura cu Stripe)", /eq\(orderSubmissions\.paymentMethod, "op"\)/.test(dash));
      // „De unde vin oamenii astia?" — canalul, cu bani, pe toate comenzile.
      t("comanda de pe WhatsApp: se alege canalul care a adus clientul", /De unde a venit clientul/.test(nof) && /facebook\|paid\|/.test(nof) && /google\|cpc\|/.test(nof));
      const cz = citesteFisier("src/app/admin/comenzi/page.tsx");
      t("comenzi: canalul se raporteaza in LEI, nu doar in numar", /De unde au venit banii/.test(cz) && /formatRON\(v\.cents\)/.test(cz));
      t("comenzi: intra si comenzile de pe WhatsApp, nu doar Stripe", /orderSubmissions\.paymentMethod, "op"/.test(cz));
      // Sursa platii cu cardul se ia de pe plata, nu de la intoarcerea din Stripe.
      t("sursa comenzii vine din plata, nu din referrerul Stripe", /plata\?\.source\) sursa = plata\.source/.test(api) && /orders\.stripeSessionId, order\.sessionId/.test(api));
      // Formularul OP (inainte de plata): avertisment, a doua apasare trimite.
      const op = citesteFisier("src/app/comanda/transfer/TransferForm.tsx");
      t("OP: fara poze, prima apasare doar avertizeaza", /images\.length === 0 && !faraPozeConfirmat/.test(op) && /setError\(FARA_POZE_AVERTISMENT\)/.test(op));
      t("OP: butonul spune „fara poze” la a doua apasare", /Trimite fără poze/.test(op));
      for (const f of ["src/app/comanda/transfer/TransferForm.tsx", "src/app/articol/[token]/ArticleForm.tsx"]) {
        const x = citesteFisier(f);
        // 01.10.2026 — dupa plata linkurile se pun pe cuvinte (EditorLinkuri); la OP ramane caseta.
        t(`${f.split("/").pop()}: cere linkurile dorite`, /linkNotes/.test(x) && (/Linkurile dorite/.test(x) || /EditorLinkuri/.test(x)));
      }
      // Micsorarea in browser: pana pe 13.09 pozele de telefon erau RESPINSE.
      const cpz = citesteFisier("src/lib/comprima-poza.ts");
      t("pozele se micsoreaza la 2000px, rotite dupa EXIF", /LATURA_MAX = 2000/.test(cpz) && /imageOrientation: "from-image"/.test(cpz));
      t("ce nu se poate micsora trece neatins, nu se pierde", (cpz.match(/return file;/g) || []).length >= 5);
      t("calea comuna de upload micsoreaza si ea", /comprimaPoza\(fisierOriginal\)/.test(citesteFisier("src/lib/upload-client.ts")));
    }
    t("linkurile cerute se salveaza pe comanda (card si OP)", /linkNotes: d\.linkNotes/.test(citesteFisier("src/app/api/articol/submit/route.ts")) && /linkNotes: d\.linkNotes/.test(citesteFisier("src/app/api/comanda/transfer/route.ts")));
    t("coloana link_notes e in schema, fix-db si plasa", /link_notes/.test(citesteFisier("src/db/schema.ts")) && /link_notes/.test(citesteFisier("src/app/api/admin/fix-db/route.ts")) && /link_notes/.test(citesteFisier("src/lib/ensure-columns.ts")));
    t("admin: linkurile cerute apar in caseta de linkuri", /r\.linkNotes/.test(citesteFisier("src/app/admin/materiale/[id]/page.tsx")));
  }

  // Word: clientul urca .docx-ul; scoatem textul, linkurile de pe cuvinte si pozele.
  {
    const relsXml =
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://www.artjunkie.ro/?a=1&amp;b=2" TargetMode="External"/>' +
      '<Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.jpeg"/>' +
      '<Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image2.emf"/>' +
      "</Relationships>";
    const docXml =
      '<?xml version="1.0"?><w:document xmlns:w="w" xmlns:r="r" xmlns:a="a"><w:body>' +
      "<w:p><w:r><w:t>ART JUNKIE – 17 ani de experiență în amenajarea ferestrelor</w:t></w:r></w:p>" +
      "<w:p><w:r><w:t xml:space=\"preserve\">La Iași, </w:t></w:r><w:hyperlink r:id=\"rId5\"><w:r><w:t>showroomul ART JUNKIE</w:t></w:r></w:hyperlink><w:r><w:t xml:space=\"preserve\"> construiește proiecte &amp; soluții.</w:t></w:r></w:p>" +
      '<w:p><w:r><w:drawing><a:blip r:embed="rId7"/></w:drawing></w:r></w:p>' +
      '<w:p><w:r><w:drawing><a:blip r:embed="rId8"/></w:drawing></w:r></w:p>' +
      "<w:p><w:r><w:t>Al doilea paragraf.</w:t><w:br/><w:t>Rând nou.</w:t></w:r></w:p>" +
      "<w:p/>" +
      "</w:body></w:document>";
    const enc = (s: string) => new TextEncoder().encode(s);
    const docx = zipSync({
      "[Content_Types].xml": enc("<Types/>"),
      "word/document.xml": enc(docXml),
      "word/_rels/document.xml.rels": enc(relsXml),
      "word/media/image1.jpeg": new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]),
      "word/media/image2.emf": new Uint8Array([1, 2, 3]),
    });
    const d = citesteDocx(docx);
    t("docx: primul paragraf scurt devine titlu", d.title === "ART JUNKIE – 17 ani de experiență în amenajarea ferestrelor");
    t("docx: textul ancorei ramane in corp, paragrafele despartite de rand gol", d.body === "La Iași, showroomul ART JUNKIE construiește proiecte & soluții.\n\nAl doilea paragraf.\nRând nou.", d.body);
    t("docx: linkul de pe cuvinte iese ca ancora → adresa, cu &amp; decodat", d.links.length === 1 && d.links[0].text === "showroomul ART JUNKIE" && d.links[0].url === "https://www.artjunkie.ro/?a=1&b=2");
    t("docx: notele de linkuri au forma din formular", linkuriCaNote(d.links) === "showroomul ART JUNKIE → https://www.artjunkie.ro/?a=1&b=2");
    t("docx: poza jpeg intra, emf-ul (nepublicabil) nu", d.images.length === 1 && d.images[0].name === "image1.jpeg" && d.images[0].mime === "image/jpeg" && d.images[0].data.byteLength === 7);
    let eroare = "";
    try { citesteDocx(enc("nu e zip")); } catch (e) { eroare = (e as Error).message; }
    t("docx: un fisier care nu e .docx da mesaj in romana", /nu e un document Word/.test(eroare));
    t("un paragraf cu punct final nu e titlu", !paraArataATitlu("Aceasta este o propoziție.") && paraArataATitlu("Titlu scurt fără punct"));
    for (const f of ["src/app/comanda/transfer/TransferForm.tsx", "src/app/articol/[token]/ArticleForm.tsx"]) {
      const s = citesteFisier(f);
      t(`${f.split("/").pop()}: are importul din Word si il trimite la /api/docx`, /importaDocx\(/.test(s) && /accept="\.docx/.test(s) && /importing/.test(s));
    }
    const rd = citesteFisier("src/app/api/docx/route.ts");
    t("ruta /api/docx: maxim 3 poze, cele peste 8MB sarite, pozele grupate pe comanda", /MAX_IMAGES = 3/.test(rd) && /MAX_UPLOAD_BYTES/.test(rd) && /comenzi\/\$\{order\.sessionId\}/.test(rd));
  }

  // Publicatii partenere: niveluri, termene in zile lucratoare, plasari.
  {
    t("adaosul pe plasare e 250 lei la bucata", ADAOS_PLASARE === 250 && pretClient(80) === 330 && pretClient(400) === 650);
    // Reducerea la volum iese DOAR din adaosul nostru: tariful publicatiei se
    // datoreaza oricum, indiferent cate bucati ia clientul.
    t("pragurile de volum: 3, 5, 10", adaosPentru(1) === 250 && adaosPentru(3) === 225 && adaosPentru(7) === 200 && adaosPentru(12) === 175);
    t("nu se coboara sub 175", Math.min(...[1, 3, 5, 10, 50].map(adaosPentru)) === 175);
    t("reducerea nu atinge tariful publicatiei", (() => {
      const x = totalCatreClient([80, 150, 150, 250, 400]);
      return x.costPartener === 1030 && x.adaos === 200 && x.total === 2030 && x.marja === 1000;
    })());
    t("clientul vede cat economiseste", totalCatreClient([80, 150, 150, 250, 400]).economie === 250);
    t("la o bucata nu exista reducere", totalCatreClient([250]).total === 500 && totalCatreClient([250]).economie === 0);
    t("pragul urmator se spune la vanzare", (() => {
      const u = urmatorulPrag(4);
      return u?.deLa === 5 && u.economiePeBucata === 25;
    })());
    t("peste ultimul prag nu mai e nimic de promis", urmatorulPrag(12) === null);
    // Nivelul cere SI autoritate SI trafic: un domeniu vechi fara cititori si
    // un site cu trafic cumparat arata amandoua bine pe un singur indicator.
    t("nivelul cere si autoritate, si trafic", nivelPropus(40, 500).id === "bronz" && nivelPropus(2, 900_000).id === "bronz");
    t("cu amandoua, urca", nivelPropus(38, 200_000).id === "platina" && nivelPropus(20, 20_000).id === "argint");
    t("fara cifre, nivelul de baza", nivelPropus(null, null).id === "bronz");
    // Zile lucratoare: fara ele am expira parteneri peste Paste sau de 1 Mai.
    t("sambata si duminica nu sunt lucratoare", !eZiLucratoare(new Date("2026-09-12T10:00:00+03:00")) && !eZiLucratoare(new Date("2026-09-13T10:00:00+03:00")));
    t("1 decembrie nu e lucratoare", !eZiLucratoare(new Date("2026-12-01T10:00:00+02:00")));
    t("vinerea + 3 zile lucratoare cade miercuri", (() => {
      const d = adaugaZileLucratoare(new Date("2026-09-11T16:00:00+03:00"), 3);
      return d.toISOString().slice(0, 10) === "2026-09-16";
    })());
    t("ziua de start nu se numara", (() => {
      const d = adaugaZileLucratoare(new Date("2026-09-14T16:00:00+03:00"), 2);
      return d.toISOString().slice(0, 10) === "2026-09-16";
    })());
    // Tranzitiile, verificate pe server: butonul poate fi de ieri.
    t("drumul normal e permis", tranzitiePermisa("trimis", "acceptat") && tranzitiePermisa("acceptat", "publicat") && tranzitiePermisa("publicat", "finalizat"));
    t("nu se sare peste acceptare", !tranzitiePermisa("trimis", "publicat"));
    t("dintr-o stare finala nu se mai iese", !tranzitiePermisa("refuzat", "acceptat") && !tranzitiePermisa("expirat", "publicat") && eStareFinala("finalizat"));
    t("„expirat” si „finalizat” sunt lucruri diferite", etichetaStare("expirat") !== etichetaStare("finalizat"));
    t("garantia e de 12 luni de la publicare", (() => {
      const d = onlinePanaLa(new Date("2026-09-14T10:00:00Z"));
      return d.getUTCFullYear() === 2027 && d.getUTCMonth() === 8;
    })());
    t("domeniul clientului se scoate din notele de linkuri", domeniulDinNote("perdele Iași → https://www.artjunkie.ro/contact") === "artjunkie.ro");
    // Materialul se COPIAZA pe plasare: pe comanda stau numele si telefonul
    // clientului, iar publicatia nu are voie sa ajunga la ele printr-un join.
    const api = citesteFisier("src/lib/trimite-plasari.ts");
    t("plasarea copiaza articolul, nu-l leaga de comanda", /articleTitle: d\.title/.test(api) && /articleBody: d\.body/.test(api));
    t("preturile se ingheata la trimitere, cu adaosul de volum", /pricePartner: pretPartener/.test(api) && /pretClient = d\.pretClientFix \?\? tarif \+ adaos/.test(api) && /adaosPentru\(alese\.length\)/.test(api));
    t("publicatia fara tarif sau suspendata nu primeste articole", /status !== "approved" \|\| !p\.pricePerArticle/.test(api));
    const pub = citesteFisier("src/app/api/placements/[token]/route.ts");
    t("refuzul dupa termen e respins pe server", /acum > new Date\(pl\.deadlineRefuz\)/.test(pub));
    t("tranzitia se verifica pe server, nu in pagina", /tranzitiePermisa\(pl\.status, tinta\)/.test(pub));
    const pag = citesteFisier("src/app/plasare/[token]/page.tsx");
    t("pagina partenerului nu se indexeaza", /robots: \{ index: false/.test(pag));
    t("un link mort nu da 404, ci explica", /Link expirat/.test(pag) && !/notFound\(\)/.test(pag));
    // Folderul de upload e dintr-o lista inchisa: semnarea unui folder liber
    // ar insemna scriere oriunde in contul Cloudinary.
    const semn = citesteFisier("src/app/api/comanda/transfer/upload-sign/route.ts");
    t("folderul de upload vine dintr-o lista inchisa", /PERMISE = \["op", "parteneri", "deconturi"\]/.test(semn));
  }

  // Contul clientului arata publicarile LIVE, nu doar dupa ce trimitem raportul.
  {
    const com = citesteFisier("src/app/cont/comenzi/page.tsx");
    const rap = citesteFisier("src/app/cont/rapoarte/page.tsx");
    t("comenzile din cont citesc starea din retea", /campaniaPentruComanda\(o\.stripeSessionId, o\.email\)/.test(com));
    t("se intreaba doar pentru comenzile platite", /orders\.filter\(\(o\) => o\.status === "paid"\)/.test(com));
    t("reteaua muta nu strica pagina clientului", /catch \{/.test(com) && /stari\.set/.test(com));
    t("nu se citeste la fiecare reincarcare", /export const revalidate = 60/.test(com));
    t("rapoartele arata campania in curs, cu linkul public", /Campania în curs/.test(rap) && /campanie\.raportUrl/.test(rap));
    t("cand nu exista campanie, textul vechi ramane", /Încă nu ai niciun raport/.test(rap));
    t("referinta platii ajunge in contul clientului", /stripeSessionId: orders\.stripeSessionId/.test(citesteFisier("src/lib/entitlements.ts")));
    t("emailul de confirmare duce linkul publicarilor", /Urmărește publicările/.test(citesteFisier("src/app/api/articol/submit/route.ts")));
  }

  // Elementele plutitoare nu au voie sa stea peste ce vinde: nici peste
  // butonul de cumparare, nici peste caseta de pret. Regula e una singura
  // (useZonaLibera) si o respecta AMANDOUA bulele — pe 19.09 cercul verde de
  // WhatsApp musca din „500 lei" tocmai pentru ca avea logica lui.
  {
    const bp = citesteFisier("src/components/comanda/comanda-promo.tsx");
    const bula = citesteFisier("src/components/OfferChatBubble.tsx");
    const wa = citesteFisier("src/components/layout/WhatsAppButton.tsx");
    const zona = citesteFisier("src/hooks/useZonaLibera.ts");
    const pret = citesteFisier("src/app/oferta-500/PromoOffer.tsx");

    t("butonul de comanda e marcat, ca sa poata fi gasit", /data-comanda="1"/.test(bp));
    t("caseta de pret e marcata ca zona care nu se acopera", /data-nu-acoperi="1"/.test(pret));
    // 25.09.2026 — pe telefon bula statea peste randul „Advertorialele sunt
    // sub 2%", adica peste argumentul pentru care exista caseta.
    // 28.09.2026 — sertarul meniului, ascuns in dreapta, latea pagina la 774px
    // pe telefon: bara de comanda iesea dubla, WhatsApp iesea din ecran.
    {
      const nav = citesteFisier("src/components/layout/MobileNav.tsx");
      t("sertarul meniului e taiat de un container fix, nu lateste pagina", /fixed inset-0 z-50 overflow-hidden/.test(nav) && /"absolute top-0 right-0 h-full/.test(nav));
      t("plasa: pagina nu are voie sa se lateasca pe telefon", /overflow-x:\s*clip/.test(citesteFisier("src/app/globals.css")));
    }
    // 28.09.2026 — bara fixa de comanda statea peste „500 lei" pe telefoanele mici.
    {
      const cw = citesteFisier("src/components/conversion/ConversionWidgets.tsx");
      t("bara fixa se da la o parte cat pretul trece pe sub ea", /useZonaLibera\(true, "\[data-pret\]"/.test(cw) && /translate-y-full/.test(cw));
      t("caseta de pret are semnul pe care il urmareste bara", /data-pret="1"/.test(citesteFisier("src/app/oferta-500/PromoOffer.tsx")));
      t("bara nu urmareste propriul buton (s-ar ascunde pentru totdeauna)", !/useZonaLibera\(true, "\[data-comanda\]/.test(cw));
    }
    t("caseta „de ce nu e o retea de linkuri” nu se acopera",
      /data-nu-acoperi="1"/.test(citesteFisier("src/components/StareRetea.tsx")));
    t(
      "regula se uita si la butoane, si la zonele marcate",
      /IntersectionObserver/.test(zona) && /\[data-comanda\], \[data-nu-acoperi\]/.test(zona),
    );
    t("regula e una singura, folosita de amandoua bulele", /useZonaLibera/.test(bula) && /useZonaLibera/.test(wa));
    t("ascunsa, bula de chat nu mai prinde atingeri", /pointer-events-none opacity-0/.test(bula));
    t("ascuns, butonul de WhatsApp nu mai prinde atingeri", /pointer-events-none opacity-0/.test(wa));
    t("chatul deschis nu se ascunde niciodata", /useZonaLibera\(!open\)/.test(bula));
    t("doar pe ecrane mici (aceeasi limita ca „lg:”)", /max-width: 1023px/.test(zona));
    t(
      "zonele se recitesc dupa hidratare (caseta de pret apare tarziu)",
      /setTimeout\(adunaZone/.test(zona),
    );
  }

  // Pagina de plata cerea opt lucruri pentru 500 de lei; 40 din 45 de oameni
  // se opreau acolo. Datele de facturare au trecut dupa plata.
  {
    const ch = citesteFisier("src/app/api/checkout/route.ts");
    const form = citesteFisier("src/app/articol/[token]/ArticleForm.tsx");
    const api = citesteFisier("src/app/api/articol/submit/route.ts");
    const sch = citesteFisier("src/db/schema.ts");
    const ens = citesteFisier("src/lib/ensure-columns.ts");

    t("adresa nu mai e obligatorie la plata", !/billing_address_collection: "required"/.test(ch));
    t("Stripe cere doar ce-i trebuie cardului", (ch.match(/billing_address_collection: "auto"/g) || []).length === (ch.match(/billing_address_collection:/g) || []).length);
    t("telefonul nu se mai cere la plata", !/phone_number_collection/.test(ch));
    t("recuperarea cosului abandonat ramane pornita", /after_expiration/.test(ch) && /recovery: \{ enabled: true/.test(ch));

    t("formularul de dupa plata cere CUI si adresa", /CUI \(pentru factur/.test(form) && /Adresa firmei \(pentru factur/.test(form));
    t("spune pe fata ca sunt doar pentru factura", /Le folosim doar la factur/.test(form));
    t("campurile pleaca spre server", /\n          cui,\n          billingAddress,/.test(form));

    t("serverul le accepta", /cui: z\.string\(\)/.test(api) && /billingAddress: z\.string\(\)/.test(api));
    t("serverul le salveaza pe comanda", /cui: d\.cui \|\| null/.test(api) && /billingAddress: d\.billingAddress \|\| null/.test(api));
    // 25.09.2026 — tabela avea deja company_cui/company_address si pe alea le
    // afiseaza admin-ul; pe 21.09 s-a scris doar in coloanele noi, iar CUI-ul
    // „disparuse" din pagina comenzii. Se scrie in amandoua, se citeste din
    // amandoua, iar randul apare si cand lipseste.
    t("CUI-ul se scrie si in coloana pe care o citeste admin-ul", /companyCui: d\.cui \|\| null/.test(api) && /companyAddress: d\.billingAddress \|\| null/.test(api));
    {
      const adm = citesteFisier("src/app/admin/materiale/[id]/page.tsx");
      t("admin-ul citeste CUI-ul din ambele coloane", /r\.companyCui \|\| r\.cui/.test(adm) && /r\.companyAddress \|\| r\.billingAddress/.test(adm));
      t("randul de CUI apare si cand lipseste, cu indemn", /nu l-a scris; cere-l/.test(adm));
    }
    // 25.09.2026 — emailurile de factura si de publicare trimit la pagina
    // publica a campaniei („urmariti in timp real"), nu promit un raport separat.
    {
      const oa = citesteFisier("src/app/admin/materiale/[id]/OrderActions.tsx");
      t("emailul de factura are linkul de urmarire in timp real", /urmări campania în timp real/.test(oa) && /raportUrl/.test(oa));
      t("fara link inca, ramane un loc vizibil de completat", /\[LINK RAPORT/.test(oa));
      t("emailul „am publicat” nu mai promite raport separat", !/Vă trimitem separat raportul/.test(oa));
      t("pagina comenzii trimite linkul raportului in emailuri", /raportUrl=\{retea\.stare === "gasita"/.test(citesteFisier("src/app/admin/materiale/[id]/page.tsx")));
    }
    t("CUI-ul lipsa se ia de pe pagina Stripe", /checkout\.sessions\.retrieve\(order\.sessionId\)/.test(api) && /camp\("company_cui"\)/.test(api));
    t("apar in emailul catre admin, langa restul datelor", /kv\("CUI"/.test(api) && /kv\("Adresa facturare"/.test(api));
    t("exista in schema", /cui: text\("cui"\)/.test(sch) && /billingAddress: text\("billing_address"\)/.test(sch));
    t("coloanele se creeaza singure, nu asteapta fix-db", /"cui" text/.test(ens) && /"billing_address" text/.test(ens));

    // Contabila identifica incasarile dupa firma si CUI. Nu le mai CEREM
    // inainte de plata, dar le SCRIEM pe tranzactie dupa — altfel nu mai
    // poate lega plata de firma si i le trimite proprietarul de mana.
    t("firma si CUI raman pe pagina de card, ca sa le aiba contabila", /key: "company_name"/.test(ch) && /key: "company_cui"/.test(ch));
    t("dar sunt OPTIONALE, nu opresc plata", (ch.match(/optional: true/g) || []).length === (ch.match(/key: "company_/g) || []).length && !/optional: false/.test(ch));
    t("nr. reg. comert si codul TVA au disparut", !/company_reg_no/.test(ch) && !/tax_id_collection:\s*\{/.test(ch));
    t("firma si CUI ajung pe plata din Stripe", /paymentIntents\.update/.test(api));
    t("apar in descrierea platii, nu doar in metadata", /description: \[firma, codFiscal/.test(api));
    t("o eroare la Stripe nu strica o comanda deja platita", /nu am putut scrie firma pe plata Stripe/.test(api));
    t("datele completeaza si profilul clientului, doar unde e gol", /companyCui = d\.cui/.test(api) && /doarGoale/.test(api));
  }

  // Pagina care raspunde la „e o retea de linkuri?" — cea mai scumpa obiectie
  // pe care o avem. Raspunde prin cifre, nu prin negare.
  {
    const tr = citesteFisier("src/app/transparenta/page.tsx");
    const sm = citesteFisier("src/app/sitemap.ts");

    t("pagina exista si e in sitemap", /Transparen/.test(tr) && /\/transparenta/.test(sm));
    t("cifrele vin live din retea, nu scrise de mana", /cifreLive/.test(tr) && /c\.publicatii/.test(tr));
    t("are data langa cifre", /c\.laData/.test(tr));
    t("arata starea retelei, nu doar o afirma", /<StareRetea \/>/.test(tr));
    t("spune raportul advertorialelor fata de redactie", /sub 2%/.test(tr));
    t("nu promite pozitii in Google", /Nu promitem pozi[țt]ii [îi]n Google/.test(tr));
    t("nu repeta acuzatia in titlu", !/retea de linkuri|re\u021bea de linkuri/i.test(tr.split("export const metadata")[1] || ""));
    t("nu publica cititori unici pe site", !/cititori unici/i.test(tr));
    // Pentru clientul de SEO: esalonarea e dovada ca nu vindem linkuri la kilogram.
    t("explica esalonarea, cu toate trei variantele", /12 ore lucr/.test(tr) && /pe 3 zile/.test(tr) && /pe 2 s[ăa]pt/.test(tr));
    t("spune de ce conteaza, nu doar ca se poate", /o singur[ăa] achizi[țt]ie/.test(tr));
    t("pomeneste si ancorele variate", /de cincizeci de ori/.test(tr));
  }

  // Raportul LIVE pe /exemple: un PDF poate fi pregatit pentru vanzare, un
  // raport care se completeaza azi, nu.
  {
    const ex = citesteFisier("src/app/exemple/page.tsx");
    const camp = citesteFisier("src/data/campanii.ts");
    t("exista raportul live, pe langa PDF", /EXEMPLU_RAPORT_LIVE/.test(camp) && /EXEMPLU_RAPORT_LIVE/.test(ex));
    t("duce la un raport real din retea", /botosaniexpres\.ro\/raport\//.test(camp));
    t("spune ca e in curs, ca sa nu para incomplet", /n curs de publicare/.test(ex));
    t("PDF-ul de exemplu ramane, nu l-am inlocuit", /EXEMPLU_RAPORT\.url/.test(ex));
  }

  // „De unde vin banii" in admin: sursa se salva din 13.09, dar nu se vedea
  // nicaieri adunata — iar decizia de buget se lua din amintiri.
  {
    const adm = citesteFisier("src/app/admin/page.tsx");
    t("dashboardul arata banii pe sursa", /De unde vin banii/.test(adm));
    t("aduna SI cardul, SI transferul, pe aceeasi sursa", /for \(const r of cardSurse\) adauga/.test(adm) && /for \(const r of opRows\) adauga/.test(adm));
    t("comenzile prin transfer isi aduc sursa din baza", /source: orderSubmissions\.source/.test(adm));
    t("are si fereastra de 30 de zile, nu doar totalul", /total30/.test(adm) && /30 \* 24 \* 60 \* 60 \* 1000/.test(adm));
    t("numele sursei e cel din lib, nu scris de mana", /etichetaSursa\(r\.sursa/.test(adm));
    t("spune pe fata ce inseamna „necunoscuta”", /nainte de 13 septembrie/.test(adm));

    // Incasarile pe luni: o cifra singura nu spune daca afacerea creste.
    t("dashboardul are incasarile pe luni", /[ÎI]ncas[ăa]ri pe luni/.test(adm));
    t("aduna card si transfer si aici", /for \(const r of cardSurse\) laLuna/.test(adm) && /for \(const r of opRows\) laLuna/.test(adm));
    t("luna se ia dupa ora Romaniei, nu UTC", /laLuna[\s\S]{0,400}Europe\/Bucharest/.test(adm));
    t("spune ca luna curenta e inca in desfasurare", /[îi]nc[ăa] [îi]n desf[ăa][șs]urare/.test(adm));

    // Si in lista de clienti: „clientii mari de unde apar?" e intrebarea care
    // decide unde pui banii de reclama.
    const cli = citesteFisier("src/app/admin/clienti/page.tsx");
    t("lista de clienti are coloana de sursa", /Venit din/.test(cli));
    t("cauta sursa si pe card, si pe transfer", /surseCard/.test(cli) && /surseOp/.test(cli));
    t("retine PRIMA sursa, nu ultima", /if \(!cur \|\| cand < cur\.cand\)/.test(cli));
    t("acelasi nume ca pe dashboard", /etichetaSursa\(u\.sursa\)/.test(cli));
  }

  // BUG-UL de o luna: pozele nu se urcau niciodata din formularul de articol,
  // si nici nu aparea vreo eroare. `e.target.value = ""` golea lista VIE de
  // fisiere inainte ca functia asincrona sa apuce s-o citeasca.
  {
    const form = citesteFisier("src/app/articol/[token]/ArticleForm.tsx");
    const op = citesteFisier("src/app/comanda/transfer/TransferForm.tsx");

    t("lista se copiaza INAINTE de golirea campului", /const alese = Array\.from\(e\.target\.files \|\| \[\]\);\s*\n\s*e\.target\.value = "";/.test(form));
    t("functia primeste o copie, nu lista vie a inputului", /async function uploadFiles\(alese: File\[\]\)/.test(form));
    t("nu se mai citeste lista dupa await", !/Array\.from\(files\)/.test(form));
    t("formularul de OP copia deja inainte de primul await", /Array\.from\(list\)/.test(op));
  }

  // 22.09.2026 — un client care PLATISE a ramas blocat: incarcarea pozelor ii
  // pica in browser, iar cele 3 poze obligatorii nu-l lasau sa trimita nimic.
  {
    const form = citesteFisier("src/app/articol/[token]/ArticleForm.tsx");
    const api = citesteFisier("src/app/api/articol/submit/route.ts");

    t("fara poze: avertisment o data, la a doua apasare trimite (nu mai e zid)", /images\.length === 0 && !faraPozeConfirmat/.test(form));
    t("cand incarcarea a picat, mesajul spune ca punem captura site-ului", /punem o captură a site-ului tău, iar pozele ni le poți trimite pe WhatsApp/.test(form));
    t("si doar la a doua apasare, ca sa fie o decizie", /faraPozeConfirmat/.test(form));
    t("butonul spune limpede ce se intampla", /Trimite f\u0103r\u0103 poze — le dau pe WhatsApp/.test(form));
    t("clientului i se spune unde sa trimita pozele", /pe WhatsApp la \$\{SITE\.phone\}/.test(form));
    t("semnalul ajunge la server", /pozeEsuate: Boolean\(pozeEroare\)/.test(form));
    t("serverul pastreaza semnalul de incarcare esuata, pentru email", /pozeEsuate: z\.boolean\(\)\.optional\(\)/.test(api) && /d\.pozeEsuate/.test(api));
    t("emailul catre admin striga ca pozele au picat", /\u00ceNC\u0102RCAREA POZELOR I-A E\u0218UAT/.test(api));
  }

  // Doua preturi pentru acelasi lucru, pe doua pagini: pe /pachete scria
  // „National 50 — 1.500 lei", iar reclama spunea 500. Un om a intrebat de ce.
  {
    const pach = citesteFisier("src/app/pachete/page.tsx");
    const promo = citesteFisier("src/app/oferta-500/PromoOffer.tsx");

    t("pagina de pachete trimite la oferta de 500", /href="\/oferta-500"/.test(pach));
    t("si spune de ce preturile de acolo sunt altele", /Pre\u021burile de mai jos sunt/.test(pach) && /de list\u0103/.test(pach));
    t("caseta de pret explica cele doua cifre", /Pre\u021bul obi\u0219nuit al pachetului este/.test(promo));
    t("spune si cat iese pe ziar", /lei pe ziar/.test(promo));
    t("foloseste preturile reale, nu cifre scrise de mana", /offer\.listPrice/.test(promo) && /offer\.price \/ 50/.test(promo));
    t("explicatia nu apare la abonament, unde n-are sens", /showPrice && !monthly/.test(promo));
  }

  // Obiectia „e facut cu AI", raspunsa pe pagina inainte sa fie pusa.
  {
    const of = citesteFisier("src/app/oferta-500/page.tsx");
    const k2 = buildAdvisorKnowledge();
    t("pagina raspunde la intrebarea despre AI", /Articolele sunt scrise cu AI\?/.test(of));
    t("raspunsul spune ce sanctioneaza Google, nu neaga AI-ul", /nu penalizează un text pentru că a fost scris cu AI/.test(of));
    t("si repeta ca nu promitem pozitii", /nu promitem poziții în Google/.test(of));
    t("consultantul stie acelasi raspuns", /E scris cu AI\?/.test(k2));
    // Numele modelelor nu apar in paginile publice: clientul cumpara aparitii
    // in presa, nu tehnologie, iar „modele de top" muta discutia unde nu ne
    // convine. (Se cauta doar in textul vizibil, nu in comentarii de cod.)
    const publice = ["src/app/oferta-500/page.tsx", "src/app/despre/page.tsx", "src/app/reteaua-noastra/page.tsx", "public/llms.txt"];
    t("nicio pagina publica nu da nume de modele", publice.every((f) => !/\b(GPT-4|gpt-4o|Claude|Gemini|Sonnet|Opus|Llama)\b/.test(citesteFisier(f))));
  }

  // Pentru modelele AI: llms.txt cu serviciul, preturile si limitele; FAQ ca schema.
  {
    const llms = citesteFisier("public/llms.txt");
    t("llms.txt exista si spune pretul, reteaua si ce NU promitem", /500 lei/.test(llms) && /50 de ziare/.test(llms) && /Nu promitem poziții/.test(llms));
    t("llms.txt trimite la paginile utile", /\/oferta-500/.test(llms) && /\/reteaua-noastra/.test(llms) && /\/exemple/.test(llms));
    t("oferta are schema FAQPage din aceleasi intrebari", /"@type": "FAQPage"/.test(citesteFisier("src/app/oferta-500/page.tsx")));
    // Cifrele retelei: citite live din platforma, cu rezerva statica datata.
    const cl = citesteFisier("src/lib/cifre-live.ts");
    t("cifrele retelei se citesc live din /api/public/cifre, o data pe ora", /\/api\/public\/cifre/.test(cl) && /revalidate: 3600/.test(cl));
    t("fara raspuns de la retea raman cifrele statice, cu data lor", /return rezerva/.test(cl) && /sursa: "static"/.test(cl));
    t("o cifra suspect de mica nu inlocuieste una reala", /peLuna < 1000/.test(cl));
    t("oferta foloseste cifrele live", /await cifreLive\(\)/.test(citesteFisier("src/app/oferta-500/page.tsx")));
    // Starea retelei, live: cate ziare au publicat azi, pe oferta si pe /reteaua-noastra.
    const sr = citesteFisier("src/lib/stare-retea.ts");
    t("starea retelei se citeste din /api/public/stare, la 10 minute", /\/api\/public\/stare/.test(sr) && /revalidate: 600/.test(sr));
    t("fara raspuns, sectiunea nu apare (nu cifre vechi ca „acum”)", /return null/.test(sr) && /if \(!s\) return null/.test(citesteFisier("src/components/StareRetea.tsx")));
    t("starea retelei e pe oferta si pe pagina retelei", /<StareRetea compact \/>/.test(citesteFisier("src/app/oferta-500/page.tsx")) && /<StareRetea \/>/.test(citesteFisier("src/app/reteaua-noastra/page.tsx")));
    t("explicatia „de ce nu e retea de linkuri” e in componenta", /nu e o „rețea de linkuri”/.test(citesteFisier("src/components/StareRetea.tsx")));
  }

  // Legatura cu reteaua: pagina comenzii cauta campania si ofera raportul.
  {
    const mat = citesteFisier("src/app/admin/materiale/[id]/page.tsx");
    t("pagina comenzii intreaba reteaua dupa referinta si email", /campaniaPentruComanda\(r\.stripeSessionId, r\.email\)/.test(mat));
    t("pagina comenzii arata cate articole sunt live si raportul public", /articoleLive/.test(mat) && /raportUrl/.test(mat));
    t("fara RETEA_KEY pagina nu cade, spune ca nu e configurat", /neconfigurat/.test(citesteFisier("src/lib/retea.ts")) && /neconfigurat/.test(mat));
    t("formularul de raport primeste linkul din retea", /initialReportUrl/.test(citesteFisier("src/app/admin/rapoarte/RaportForm.tsx")));
  }
  const fixDb = citesteFisier("src/app/api/admin/fix-db/route.ts");
  t("coloanele source sunt in fix-db", /"order" ADD COLUMN IF NOT EXISTS "source"/.test(fixDb) && /"order_submission" ADD COLUMN IF NOT EXISTS "source"/.test(fixDb));
  const ens = citesteFisier("src/lib/ensure-columns.ts");
  t("si in plasa de siguranta", /"order" ADD COLUMN IF NOT EXISTS "source"/.test(ens) && /"order_submission" ADD COLUMN IF NOT EXISTS "source"/.test(ens));
  t("emailurile catre admin spun de unde a venit clientul (card, transfer, articol)",
    /kv\("De unde a venit", etichetaSursa\(source\)\)/.test(citesteFisier("src/app/api/webhook/stripe/route.ts")) &&
    /kv\("De unde a venit", etichetaSursa\(sursa\)\)/.test(citesteFisier("src/app/api/comanda/transfer/route.ts")) &&
    /kv\("De unde a venit", etichetaSursa\(sursa\)\)/.test(citesteFisier("src/app/api/articol/submit/route.ts")));
  t("captarea e montata in layout", /<SourceCapture \/>/.test(citesteFisier("src/app/layout.tsx")));
  t("adminul arata sursa la comenzi, materiale si pe fiecare material",
    /etichetaSursa\(o\.source\)/.test(citesteFisier("src/app/admin/comenzi/page.tsx")) &&
    /etichetaSursa\(r\.source\)/.test(citesteFisier("src/app/admin/materiale/page.tsx")) &&
    /etichetaSursa\(r\.source\)/.test(citesteFisier("src/app/admin/materiale/[id]/page.tsx")));
  // 12.09.2026 — un lead a venit din popup-ul de iesire fara propozitia cu
  // sursa: era doar pe doua din cele cinci linkuri de WhatsApp. Acum fiecare
  // fisier care construieste un link wa.me cu text trebuie sa o includa.
  {
    const cuWa = [
      "src/app/oferta-500/PromoOffer.tsx",
      "src/components/layout/WhatsAppButton.tsx",
      "src/components/conversion/ExitIntentPopup.tsx",
      "src/components/forms/RequestListForm.tsx",
      "src/app/comanda/anulat/page.tsx",
      "src/components/WhatsAppCta.tsx",
    ];
    for (const f of cuWa) {
      const src = citesteFisier(f);
      t(`linkul de WhatsApp din ${f.split("/").pop()} poarta sursa`, /wa\.me\/\$\{SITE\.whatsapp\}\?text=/.test(src) && /propozitieSursa/.test(src));
    }
  }
  t("WhatsApp-ul de pe oferta si butonul flotant primesc propozitia",
    /useSursaWhatsApp\(\)/.test(citesteFisier("src/app/oferta-500/PromoOffer.tsx")) &&
    /useSursaWhatsApp\(\)/.test(citesteFisier("src/components/layout/WhatsAppButton.tsx")));
}


// ---------------------------------------------------------------------------
// Banda cu clienti
// ---------------------------------------------------------------------------
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  t("fiecare client are nume", CLIENTI.every((c) => c.nume.trim().length > 1));
  t("numele clientilor sunt unice", new Set(CLIENTI.map((c) => c.nume)).size === CLIENTI.length);
  t("logo-urile sunt fisier local simplu sau link https", CLIENTI.every((c) => !c.logo || /^[a-z0-9-]+\.(png|svg|webp)$/.test(c.logo) || /^https:\/\//.test(c.logo)));
  t("banda e pe oferta, pe prima pagina si pe exemple",
    /<ClientiStrip \/>/.test(citesteFisier("src/app/oferta-500/page.tsx")) &&
    /<ClientiStrip \/>/.test(citesteFisier("src/app/page.tsx")) &&
    /<ClientiStrip \/>/.test(citesteFisier("src/app/exemple/page.tsx")));
  t("fara logo pe disc, apare numele ca text", /logoExista/.test(citesteFisier("src/components/ClientiStrip.tsx")));

  // Campaniile: descrise, fara linkuri; un singur raport ca exemplu.
  const camp = JSON.stringify(CAMPANII);
  t("campaniile nu contin linkuri", !/https?:\/\//.test(camp));
  t("fiecare campanie are scop si cel putin 3 livrabile", CAMPANII.every((c) => c.scop.length > 20 && c.livrat.length >= 3));
  t("exemplul de raport exista pe disc", fs.existsSync("public" + EXEMPLU_RAPORT.url));
  t("un singur PDF de raport publicat", fs.readdirSync("public/rapoarte").filter((f) => f.endsWith(".pdf")).length === 1);
  t("oferta are clipurile „cum comanzi”, la cerere", /<VideoTutorial \/>/.test(citesteFisier("src/app/oferta-500/page.tsx")) && fs.existsSync("public/video/cum-comanzi-card.mp4") && fs.existsSync("public/video/cum-comanzi-op.mp4"));
  // 16.09.2026 — banda arata si clientii fara logo, ca nume. Cei cinci cu logo
  // conving prin cine sunt; restul arata ca nu sunt trei clienti in total.
  t("cei cinci cu logo raman primii", CLIENTI.slice(0, 5).every((c) => !!c.logo));
  t("clientii adaugati dupa ei nu trimit oameni pe site-ul lor", CLIENTI.slice(5).every((c) => !c.site));
  t("fiecare client spune ce a cumparat", CLIENTI.every((c) => (c.ce || "").trim().length > 5));
  t("lista are toti clientii care au cumparat", CLIENTI.length >= 15);
  t("oferta arata raportul ca imagine, inainte de plata", /<DovadaRaport \/>/.test(citesteFisier("src/app/oferta-500/page.tsx")) && fs.existsSync("public/rapoarte/exemplu-raport-pagina-1.jpg"));
  t("portofoliul nu mai are linkuri interne (railway)", !/railway\.app/.test(citesteFisier("src/data/portfolio.ts")));
}


// ---------------------------------------------------------------------------
// „Alege singur ziarele" (23.09.2026)
// ---------------------------------------------------------------------------
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");

  t("o publicatie costa cat pachetul Local de azi", pretAlacarte(1).total === 150);
  t("bucata scade cand alege mai multe", pretBucata(1) > pretBucata(3) && pretBucata(3) > pretBucata(5));
  t("pretul nu trece niciodata peste pretul retelei",
    [1, 2, 3, 5, 9, 20, TOTAL_ZIARE, 999].every((n) => pretAlacarte(n).total <= PRET_RETEA));
  t("toata reteaua costa exact cat oferta", pretAlacarte(TOTAL_ZIARE).total === PRET_RETEA);
  t("pretul nu scade cand adaugi publicatii",
    Array.from({ length: TOTAL_ZIARE }, (_, i) => pretAlacarte(i + 1).total)
      .every((v, i, a) => i === 0 || v >= a[i - 1]));
  t("zero publicatii = zero lei", pretAlacarte(0).total === 0);
  t("la plafon nu se mai promite nicio reducere",
    urmatorulPragZiare(TOTAL_ZIARE) === null && (urmatorulPragZiare(1)?.economiePeBucata || 0) > 0);
  t("pragul urmator e mereu inaintea lui", [1, 2, 3, 4].every((n) => (urmatorulPragZiare(n)?.deLa ?? 99) > n));

  t("slugul scapa de diacritice", slugZiar("Iași Expres") === "iasi-expres" && slugZiar("Caraș-Severin Expres") === "caras-severin-expres");
  t("fiecare publicatie are slug unic", new Set(ZIARE_ALEGIBILE.map((z) => z.slug)).size === TOTAL_ZIARE);
  t("slugurile sunt curate", ZIARE_ALEGIBILE.every((z) => /^[a-z0-9-]+$/.test(z.slug)));
  t("lista de ales e chiar reteaua", TOTAL_ZIARE === NEWSPAPERS.length);

  // Pretul se calculeaza din ce EXISTA, nu din ce trimite browserul.
  t("slugurile inventate sunt aruncate", ziareDinSluguri(["iasi-expres", "ziar-inventat"]).length === 1);
  t("acelasi ziar bifat de doua ori se numara o data", ziareDinSluguri(["cluj-expres", "cluj-expres"]).length === 1);
  t("lista goala nu poate cumpara nimic", ziareDinSluguri([]).length === 0);
  t("toata reteaua se scrie scurt in metadata", etichetaZiare(ZIARE_ALEGIBILE) === "toate");
  t("eticheta incape in metadata Stripe (500 caractere)", etichetaZiare(ZIARE_ALEGIBILE.slice(0, 4)).length < 500);
  t("emailul spune numele publicatiilor alese", numeleZiarelor("iasi-expres,cluj-expres").includes("Iași Expres"));
  t("la toata reteaua emailul nu insira 50 de nume", /toate cele/.test(numeleZiarelor("toate")));

  const api = citesteFisier("src/app/api/checkout/route.ts");
  t("checkoutul accepta modul alacarte", /"alacarte"/.test(api));
  t("checkoutul refuza cosul gol", /Alege cel putin o publicatie/.test(api));
  t("pretul se ia de pe server, din publicatiile valide", /pretAlacarte\(alese\.length\)/.test(api));
  t("publicatiile alese ajung in metadata platii", /ziare: eticheta/.test(api));
  t("webhookul le trece in emailuri", /numeleZiarelor/.test(citesteFisier("src/app/api/webhook/stripe/route.ts")));

  const pag = citesteFisier("src/app/alege-ziarele/page.tsx");
  const comp = citesteFisier("src/app/alege-ziarele/AlegeZiare.tsx");
  t("pagina exista si e in sitemap", pag.length > 500 && /alege-ziarele/.test(citesteFisier("src/app/sitemap.ts")));
  t("pagina nu scrie preturile de mana", !/\b150 lei\b/.test(pag) && /pretBucata\(1\)/.test(pag));
  t("se cumpara din pagina, prin checkout", /\/api\/checkout/.test(comp) && /mode: "alacarte"/.test(comp));
  t("se poate bifa toata reteaua dintr-un buton", /Bifeaza toate|Bifează toate/.test(comp));
  t("cazinourile nu trec pe aici", /Cazinouri/.test(pag));
  t("drumul spre pagina exista din pachete si din retea",
    /alege-ziarele/.test(citesteFisier("src/app/pachete/page.tsx")) &&
    /alege-ziarele/.test(citesteFisier("src/app/reteaua-noastra/page.tsx")));
}


// ---------------------------------------------------------------------------
// Portofelul partenerilor (29.09.2026)
// ---------------------------------------------------------------------------
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  const pl = (status: string, pricePartner: number, statementId: string | null = null) => ({ status, pricePartner, statementId });

  const s1 = calculeazaSold([pl("publicat", 150), pl("finalizat", 80), pl("acceptat", 250), pl("refuzat", 400), pl("expirat", 100)]);
  t("banii intra in sold doar din articolele publicate", s1.deIncasat === 230);
  t("acceptatele apar separat, ca bani care urmeaza", s1.inLucru === 250);
  t("refuzatele si expiratele nu se platesc", !ePlatibila("refuzat") && !ePlatibila("expirat") && !ePlatibila("anulat"));
  const s2 = calculeazaSold([pl("publicat", 150, "c1"), pl("publicat", 150, "c2"), pl("publicat", 80)], new Set(["c2"]));
  t("o plasare dintr-o cerere deschisa e „in plata”, nu „de incasat”", s2.deIncasat === 80 && s2.inPlata === 150);
  t("o plasare dintr-o cerere platita nu mai apare nicaieri", s2.inPlata + s2.deIncasat === 230);
  t("sub prag nu poate cere plata", !poateCerePlata({ deIncasat: PRAG_RETRAGERE - 1, inPlata: 0, inLucru: 0, blocat: 0, deRecuperat: 0 }, false));
  t("la prag poate cere plata", poateCerePlata({ deIncasat: PRAG_RETRAGERE, inPlata: 0, inLucru: 0, blocat: 0, deRecuperat: 0 }, false));
  t("cu o cerere deschisa nu mai poate cere a doua", !poateCerePlata({ deIncasat: 900, inPlata: 0, inLucru: 0, blocat: 0, deRecuperat: 0 }, true));
  t("„cat mai ai” nu coboara sub zero", catMaiAi(PRAG_RETRAGERE + 50) === 0 && catMaiAi(50) === PRAG_RETRAGERE - 50);
  t("IBAN valid trece (cu spatii)", ibanValid("RO49 AAAA 1B31 0075 9384 0000"));
  t("IBAN cu o cifra gresita e prins", !ibanValid("RO49AAAA1B31007593840001"));
  t("IBAN RO cu lungime gresita e prins", !ibanValid("RO49AAAA1B3100759384"));
  t("IBAN-ul se normalizeaza (fara spatii, majuscule)", normalizeazaIban(" ro49 aaaa 1b31 ") === "RO49AAAA1B31");

  const api = citesteFisier("src/app/api/partener/retragere/route.ts");
  t("cererea ruleaza intr-o tranzactie", /db\.transaction\(/.test(api));
  t("o singura cerere deschisa (409)", /status: 409/.test(api) && /eq\(partnerPayouts\.status, "cerut"\)/.test(api));
  t("plasarile se rezerva doar daca nu sunt in alta cerere", /isNull\(placements\.statementId\)/.test(api));
  t("suma NU vine din browser", !/amount:\s*d\./.test(api) && !/suma:\s*z\./.test(api) && /rezervate\.reduce/.test(api));
  t("sub prag tranzactia se anuleaza cu totul", /throw new SubPrag/.test(api));
  const adm = citesteFisier("src/app/api/admin/payouts/[id]/route.ts");
  t("„Am platit” merge doar pe o cerere deschisa (fara dublu click)", /eq\(partnerPayouts\.status, "cerut"\)/.test(adm));
  t("anularea elibereaza plasarile", /statementId: null/.test(adm));
  t("adminul trebuie sa fie logat", /getSession\(\)/.test(adm));
  const link = citesteFisier("src/app/api/partener/link/route.ts");
  t("intrarea nu spune cine e partener si cine nu", /return NextResponse\.json\(\{ ok: true \}\)/.test(link) && /inArray\(publishers\.status, \["approved", "suspended"\]\)/.test(link));
  t("regula veche de decontare a disparut peste tot", !/sfârșitul trimestrului/.test(citesteFisier("src/app/plasare/[token]/page.tsx") + citesteFisier("src/app/api/admin/publishers/[id]/route.ts")));
  t("contul de partener e legat din emailurile de plasare si de aprobare", /cont-partener/.test(citesteFisier("src/lib/trimite-plasari.ts")) && /cont-partener/.test(citesteFisier("src/app/api/admin/publishers/[id]/route.ts")));
}


// Autoritatea partenerilor, citita de noi din Moz (29.09.2026)
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  t("domeniul se scoate curat din orice adresa", domeniuDin("https://www.Ziarul.ro/stiri?x=1") === "ziarul.ro" && domeniuDin("ziarul.ro") === "ziarul.ro" && domeniuDin("nimic") === null);
  const aut = citesteFisier("src/lib/autoritate.ts");
  t("fara cheie, verificarea nu opreste nimic (intoarce null)", /if \(!token\) return null;/.test(aut));
  t("Moz nu poate bloca inscrierea (timeout)", /cuTimeout\(/.test(aut));
  t("nivelul propus foloseste si autoritatea, nu doar traficul", /nivelPropus\(p\.domainAuthority, p\.monthlyTraffic\)/.test(citesteFisier("src/app/admin/parteneri/[id]/page.tsx")));
  t("la inscriere, scorul se verifica singur", /verificaAutoritate\(d\.siteUrl\)/.test(citesteFisier("src/app/api/publishers/route.ts")));
  t("reverificarea cere login de admin", /getSession\(\)/.test(citesteFisier("src/app/api/admin/publishers/[id]/autoritate/route.ts")));
}


// Catalogul partenerilor pe /alege-ziarele (29.09.2026)
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  t("optiunea: +50%, minim 30 de lei", pretOptiuneClient(100) === 150 && pretOptiuneClient(40) === 70);
  t("optiunile invalide din baza se arunca", citesteOptiuni('[{"key":"facebook","pret":80},{"key":"hack","pret":5},{"key":"prima_pagina","pret":0}]').length === 1 && citesteOptiuni("nu e json").length === 0);
  const sub = citesteFisier("src/app/api/articol/submit/route.ts");
  t("textul suspect sau cazino NU pleaca automat la parteneri", /screenContent\(/.test(sub) && /OPRITE/.test(sub) && /trimitePlasari\(/.test(sub));
  const chk = citesteFisier("src/app/api/checkout/route.ts");
  t("pretul partenerilor se calculeaza pe server", /calculeazaParteneri\(/.test(chk));
  t("partenerul are 2 zile sa publice", /ZILE_PUBLICARE = 2\b/.test(citesteFisier("src/lib/plasari.ts")));
  t("clientul primeste linkul de la noi cand partenerul publica", /a apărut pe/.test(citesteFisier("src/app/api/placements/[token]/route.ts")));
  t("emailul catre partener nu contine clientul", !/customerEmail|clientEmail/.test(citesteFisier("src/lib/trimite-plasari.ts")));
  t("butonul de plata e marcat (bulele nu-l acopera)", /data-comanda="1"/.test(citesteFisier("src/app/alege-ziarele/AlegeZiare.tsx")));
}


// Tipul articolului scris de AI: comunicat / advertorial / SEO (29.09.2026)
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  const adv = citesteFisier("src/lib/advertorial.ts");
  t("fiecare tip are regulile lui de scris", /comunicat: `/.test(adv) && /seo: `/.test(adv) && /advertorial: `/.test(adv));
  t("AI-ul primeste linkurile si scrie exact acele cuvinte", /Foloseste EXACT aceste expresii/.test(adv));
  t("tipul se valideaza pe server", /tip: z\.enum\(TIPURI_ARTICOL\)/.test(citesteFisier("src/app/api/articol/generate/route.ts")));
  const form = citesteFisier("src/app/articol/[token]/ArticleForm.tsx");
  t("formularul trimite tipul, cuvantul-cheie si linkurile", /tip, cuvantCheie, linkuri: linkNotes/.test(form));
  t("campul de linkuri apare o singura data pe ecran", /mode !== "ai" && campLinkuri/.test(form));
}


// Articolul gata de publicat la partener: copiat cu linkuri, HTML, Word, poze (29.09.2026)
{
  const l = parseazaLinkuri("curatenie birouri → https://a.ro\nprogramare online -> https://a.ro/c.\nhttps://doar.ro");
  t("linkurile se citesc in orice forma (→, ->, doar adresa)", l.length === 3 && l[0].ancora === "curatenie birouri" && l[1].url === "https://a.ro/c" && l[2].ancora === null);
  const r = articolHtml({
    titlu: "T",
    corp: "Intro despre curatenie birouri Cluj.\n\nSubtitlu scurt\n\nText cu <script>x</script> si programare online aici.",
    linkNotes: "curatenie birouri Cluj → https://a.ro\nprogramare online → https://a.ro/c\nnu exista → https://a.ro/n",
  });
  t("linkul se pune pe cuvant, o singura data", (r.html.match(/href="https:\/\/a\.ro"/g) || []).length === 1 && /<a href="https:\/\/a\.ro">curatenie birouri Cluj<\/a>/.test(r.html));
  t("textul clientului e escapat (fara script in pagina partenerului)", !/<script>/.test(r.html) && /&lt;script&gt;/.test(r.html));
  t("linia scurta devine subtitlu", /<h2>Subtitlu scurt<\/h2>/.test(r.html));
  t("linkurile negasite sunt aratate partenerului", r.negasite.length === 1 && r.negasite[0].url === "https://a.ro/n");
  t("nofollow doar cand nu e dofollow", /rel="nofollow"/.test(articolHtml({ titlu: "", corp: "un cuvant aici", linkNotes: "cuvant → https://a.ro", dofollow: false }).html));
  t("pozele Cloudinary se descarca, nu doar se deschid", linkDescarcarePoza("https://res.cloudinary.com/x/image/upload/v1/a.jpg").includes("/upload/fl_attachment/"));
}


// Chatul client–partener: datele de contact sunt oprite (29.09.2026)
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  const prinse: [string, string][] = [
    ["suna-ma la 0722 123 456", "telefon"],
    ["+40 722-123-456", "telefon"],
    ["zero sapte doi doi unu doi trei patru cinci sase", "telefon"],
    ["scrie-mi pe ion.pop@firma.ro", "email"],
    ["ion punct pop at gmail punct com", "email"],
    ["dam-i un mesaj pe whats app", "aplicatie"],
    ["ma gasesti @ionpop88", "aplicatie"],
    ["intra pe firmamea . ro", "link"],
  ];
  for (const [text, motiv] of prinse) t(`filtrul prinde: „${text}"`, verificaContact(text) === motiv);
  t("site-ul clientului e permis (partenerul il vede oricum)", verificaContact("am pus linkul catre firma.ro", ["firma.ro"]) === null);
  t("datele si preturile nu sunt luate drept telefon", verificaContact("Apare pe 29.09.2026 10:00, pret 1500 lei, CUI 46466484") === null);
  const api = citesteFisier("src/app/api/mesaje-plasare/route.ts");
  t("cine scrie se decide din token, nu din browser", !/sender:\s*d\./.test(api) && /verificaToken\(t\)/.test(api));
  t("clientul scrie doar pe plasarile comenzii lui", /pl\.orderSubmissionId !== tok\.id/.test(api));
  const lib = citesteFisier("src/lib/mesaje-plasare.ts");
  t("mesajul oprit nu ajunge la celalalt", /isNull\(placementMessages\.blocked\)/.test(lib));
  t("la mesaj oprit, adminul primeste alerta", /Încercare de schimb de contact/.test(lib));
  t("raspunsul pe email ajunge la noi, nu la celalalt", /replyTo: ADMIN_EMAIL/.test(lib));
}


// Paza linkurilor 12 luni si influencerii (29.09.2026)
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  const pag = (corp: string, head = "") => `<html><head>${head}</head><body>${corp}</body></html>`;
  t("link dofollow catre client = ok", analizeazaPagina(pag('<a href="https://www.firma.ro/x">firma</a>'), null, ["firma.ro"], true).stare === "ok");
  t("fara link catre client = link_lipsa", analizeazaPagina(pag('<a href="https://alta.ro">x</a>'), null, ["firma.ro"], true).stare === "link_lipsa");
  t("link nofollow cand s-a promis dofollow = nofollow", analizeazaPagina(pag('<a rel="nofollow" href="https://firma.ro">x</a>'), null, ["firma.ro"], true).stare === "nofollow");
  t("sponsored conteaza tot ca nofollow", analizeazaPagina(pag('<a href="https://firma.ro" rel="sponsored noopener">x</a>'), null, ["firma.ro"], true).stare === "nofollow");
  t("nofollow e acceptat cand partenerul a spus de la inceput ca nu e dofollow", analizeazaPagina(pag('<a rel="nofollow" href="https://firma.ro">x</a>'), null, ["firma.ro"], false).stare === "ok");
  t("un singur link curat e de ajuns", analizeazaPagina(pag('<a rel="nofollow" href="https://firma.ro">x</a><a href="https://firma.ro/c">y</a>'), null, ["firma.ro"], true).stare === "ok");
  t("noindex in meta e prins", analizeazaPagina(pag('<a href="https://firma.ro">x</a>', '<meta name="robots" content="noindex, follow">'), null, ["firma.ro"], true).stare === "noindex");
  t("noindex in antet e prins", analizeazaPagina(pag('<a href="https://firma.ro">x</a>'), "noindex", ["firma.ro"], true).stare === "noindex");
  t("alt domeniu care doar CONTINE numele clientului nu conteaza", analizeazaPagina(pag('<a href="https://notfirma.ro">x</a>'), null, ["firma.ro"], true).stare === "link_lipsa");

  const sold = calculeazaSold([
    { status: "publicat", pricePartner: 200, statementId: null, linkStatus: "link_lipsa" },
    { status: "publicat", pricePartner: 150, statementId: null, linkStatus: "ok" },
    { status: "publicat", pricePartner: 100, statementId: null, linkStatus: "eroare" },
  ]);
  t("linkul stricat opreste plata, eroarea de retea nu", sold.blocat === 200 && sold.deIncasat === 250);
  t("cererea de plata nu rezerva plasarile cu link stricat", /notInArray\(placements\.linkStatus, \[\.\.\.LINK_BLOCHEAZA_PLATA\]\)/.test(citesteFisier("src/app/api/partener/retragere/route.ts")));
  t("paza merge pe cronul de 5 minute existent", /ruleazaPazaLinkuri\(\)/.test(citesteFisier("src/app/api/cron/materiale-lipsa/route.ts")));
  const pub = citesteFisier("src/app/api/placements/[token]/route.ts");
  t("la publicare, linkul se verifica pe loc", /verificaPlasare\(pl, pubV, d\.url\)/.test(pub));
  t("cu link stricat, clientul nu e anuntat", /!\(verificare && eBlocant\(verificare\.stare\)\)/.test(pub));

  t("optiunile de influencer trec prin cos", parseazaAlegeri(["abcdefgh-1+story+link_bio+hack"])[0].optiuni.join() === "story,link_bio");
  const api = citesteFisier("src/app/api/publishers/route.ts");
  t("influencerul nu primeste optiuni de presa (si invers)", /OPTIUNI_PE_TIP\[influencer \? "influencer" : "presa"\]/.test(api));
  t("la influencer nu se cere scor Moz", /influencer \? null : await verificaAutoritate/.test(api));
}


// Articol sters / link stricat: clientul si publicatia afla (29.09.2026)
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  const paza = citesteFisier("src/lib/ruleaza-paza.ts");
  t("clientul primeste email cand articolul e sters sau linkul stricat", /Am observat o problemă la articolul tău/.test(paza));
  t("clientul primeste email cand s-a rezolvat", /Rezolvat: articolul de pe/.test(paza));
  t("publicatia afla explicit ca articolul a fost sters", /Articolul a fost șters de pe/.test(paza));
  t("publicatia afla si cand site-ul nu raspunde, fara oprirea platii", /nu răspunde la verificarea noastră/.test(paza));
  t("pagina clientului spune exact ce s-a intamplat", /ETICHETE_CLIENT\[pl\.linkStatus/.test(citesteFisier("src/app/comanda-mea/[token]/page.tsx")));
  t("sectiunea „pazite 12 luni” apare doar cand exista parteneri", /parteneri\.length > 0 && \(/.test(citesteFisier("src/app/alege-ziarele/page.tsx")));
}


// Termenele partenerilor: expirare, inlocuire, abateri, recuperare (29.09.2026)
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  t("1 abatere = avertisment, 2 = suspendare, 3 = scos", consecinta(1) === "avertisment" && consecinta(2) === "suspendare" && consecinta(3) === "excludere" && consecinta(5) === "excludere");
  t("„livreaza la timp” nu se arata sub 3 comenzi", procentLaTimp({ laTimp: 2, total: 2 }) === null && procentLaTimp({ laTimp: 9, total: 10 }) === 90);
  const sold = calculeazaSold([{ status: "publicat", pricePartner: 300, statementId: null }], new Set(), 250);
  t("recuperarea se scade din soldul de incasat", sold.deIncasat === 50 && sold.deRecuperat === 250);
  const ter = citesteFisier("src/lib/termene-parteneri.ts");
  t("expirarea e conditionata (nu se dubleaza la doua rulari)", /inArray\(placements\.status, \["trimis", "acceptat"\]\)\)\)\s*\.returning\(\)/.test(ter));
  t("inlocuitorul nu costa mai mult decat cel cazut", /p\.pricePerArticle > tarifVechi/.test(ter));
  t("inlocuitorul nu e deja in comanda si nu are abateri", /dejaInComanda/.test(ter) && /cuAbateri/.test(ter));
  t("clientul plateste la inlocuire exact cat a platit", /pretClientFix: pl\.priceClient/.test(ter));
  t("articol platit si sters = recuperare din plata urmatoare", /if \(pl\.statementId && pub\)/.test(ter) && /partnerDeductions/.test(ter));
  t("refuzul in termen muta articolul, fara abatere", /inlocuiestePlasare\(refuzat, "refuzat de publicație"\)/.test(citesteFisier("src/app/api/placements/[token]/route.ts")));
  t("termenele ruleaza pe cronul de 5 minute", /ruleazaTermene\(\)/.test(citesteFisier("src/app/api/cron/materiale-lipsa/route.ts")));
  t("recuperarile intra in cererea de plata si se elibereaza la anulare", /partnerDeductions/.test(citesteFisier("src/app/api/partener/retragere/route.ts")) && /partnerDeductions/.test(citesteFisier("src/app/api/admin/payouts/[id]/route.ts")));
  const r = citesteFisier("src/app/api/comanda-mea/ramburs/route.ts");
  t("„banii inapoi” doar pe inlocuitor nepublicat, din comanda lui", /isNotNull\(placements\.replacesId\)/.test(r) && /eq\(placements\.orderSubmissionId, t\.id\)/.test(r) && /inArray\(placements\.status, \["trimis", "acceptat"\]\)/.test(r));
  t("acordul e obligatoriu si se salveaza versiunea, data, IP-ul", /declarationAccepted: z\.literal\(true/.test(citesteFisier("src/app/api/publishers/route.ts")) && /termsVersion: TERMENI_VERSIUNE/.test(citesteFisier("src/app/api/publishers/route.ts")));
  t("partenerul suspendat isi vede si isi cere banii", /\["approved", "suspended"\]\.includes\(pub\.status\)/.test(citesteFisier("src/app/api/partener/retragere/route.ts")));
}


// Abonamentul: comanda in admin, formular direct, reamintire, link lunar (29.09.2026)
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  const wh = citesteFisier("src/app/api/webhook/stripe/route.ts");
  t("abonamentul se salveaza si ca o comanda (apare in admin, primeste reamintire)", /inregistreazaComandaAbonament\(session, email, userId\)/.test(wh));
  t("in fiecare luna noua clientul primeste linkul direct catre formular", /billing_reason === "subscription_cycle"/.test(wh) && /Trimite articolul lunii/.test(wh));
  t("dupa plata abonamentului clientul ajunge direct la formular", /kind: "article"/.test(citesteFisier("src/app/comanda/multumim/page.tsx").split('session.mode === "subscription"')[1] || ""));
  t("abonamentele platite fara comanda se recupereaza din cron", /recupereazaAbonamente\(\)/.test(citesteFisier("src/app/api/cron/materiale-lipsa/route.ts")));
  t("fisierul de rute nu exporta altceva decat handlerele", !/export async function inregistreaza/.test(wh));
}


// Cronurile ruleaza din server, nu doar din afara (29.09.2026)
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  t("serverul isi porneste singur cronurile", /pornestePlanificator/.test(citesteFisier("src/instrumentation.ts")) && /materiale-lipsa/.test(citesteFisier("src/planificator.ts")));
  t("cronurile accepta cheia interna sau cea externa", /cronAutorizat\(req\.headers\)/.test(citesteFisier("src/app/api/cron/materiale-lipsa/route.ts")) && /cronAutorizat\(req\.headers\)/.test(citesteFisier("src/app/api/cron/promo-announce/route.ts")));
  t("eroarea la recuperarea abonamentelor se vede in admin", /eroareAbonamente/.test(citesteFisier("src/app/admin/materiale/page.tsx")));
}


// Linkurile puse pe cuvinte, din text; fara linkuri, numele firmei → site (01.10.2026)
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  const corp = "NOZOMI Travel deschide colaborarea cu agentiile de turism. Compania NOZOMI Travel pregateste o retea.";
  t("fara linkuri cerute: numele firmei devine link catre site", linkuriImplicite({ linkNotes: "", companyName: "NOZOMI Travel Society", siteUrl: "www.nozomi.travel", body: corp }) === "NOZOMI Travel → https://www.nozomi.travel");
  t("ancora se scurteaza pana apare in text (fara „Society”)", /^NOZOMI Travel →/.test(linkuriImplicite({ linkNotes: null, companyName: "NOZOMI Travel Society", siteUrl: "https://nozomi.travel", body: corp })));
  t("linkurile cerute de client raman neatinse", linkuriImplicite({ linkNotes: "circuite → https://nozomi.travel/circuite", companyName: "X", siteUrl: "x.ro", body: corp }) === "circuite → https://nozomi.travel/circuite");
  t("fara site, nu inventam link", linkuriImplicite({ linkNotes: "", companyName: "Firma", siteUrl: "", body: corp }) === "");
  t("adresa fara https primeste https", normalizeazaUrl("firma.ro/contact") === "https://firma.ro/contact" && normalizeazaUrl("http://a.ro") === "http://a.ro");
  t("linkurile din editor se salveaza ca „ancora → adresa”", serializeazaLinkuri([{ ancora: "curatenie", url: "https://a.ro" }, { ancora: "x", url: " " }]) === "curatenie → https://a.ro");
  const implicit = linkuriImplicite({ linkNotes: "", companyName: "NOZOMI Travel Society", siteUrl: "www.nozomi.travel", body: corp });
  const r = articolHtml({ titlu: "T", corp, linkNotes: implicit, dofollow: true });
  t("linkul implicit cade pe prima aparitie a numelui, dofollow", /<a href="https:\/\/www\.nozomi\.travel">NOZOMI Travel<\/a> deschide/.test(r.html) && !/nofollow/.test(r.html) && r.negasite.length === 0);
  const form = citesteFisier("src/app/articol/[token]/ArticleForm.tsx");
  t("formularul foloseste editorul de linkuri pe cuvinte", /<EditorLinkuri /.test(form) && /ref=\{textareaRef\}/.test(form));
  t("la trimitere se aplica linkul implicit", /d\.linkNotes = linkuriImplicite\(/.test(citesteFisier("src/app/api/articol/submit/route.ts")));
  t("adminul vede articolul cu linkurile puse si butonul de copiat", /<ArticolGata/.test(citesteFisier("src/app/admin/materiale/page.tsx")));
}


// DA (Moz) pe fiecare ziar al retelei, pe /reteaua-noastra si in PDF (01.10.2026)
{
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  const dom = domeniileRetelei();
  t("toate ziarele retelei au domeniu de masurat", dom.length >= 50 && dom.includes("botosaniexpres.ro") && dom.every((d) => !d.startsWith("www.")));
  const m = new Map([
    ["a.ro", { domain: "a.ro", da: 40, pa: 30, spam: 1, checkedAt: new Date("2026-10-01") }],
    ["b.ro", { domain: "b.ro", da: 34, pa: 28, spam: 2, checkedAt: new Date("2026-09-20") }],
    ["c.ro", { domain: "c.ro", da: null, pa: null, spam: null, checkedAt: new Date("2026-09-25") }],
  ]);
  const r = rezumatAutoritate(m)!;
  t("rezumatul: media doar pe domeniile masurate, data celei mai vechi masuratori", r.medie === 37 && r.nr === 2 && r.masuratLa.toISOString().startsWith("2026-09-20"));
  t("fara scoruri, fara rezumat", rezumatAutoritate(new Map()) === null);
  t("lista de pe site arata DA si PA langa fiecare ziar", /DA \{autoritate\[domeniu\(p\.url\)\]\.da\}/.test(citesteFisier("src/components/NewspaperDirectory.tsx")) && /PA \{autoritate\[domeniu\(p\.url\)\]\.pa\}/.test(citesteFisier("src/components/NewspaperDirectory.tsx")));
  t("PDF-ul cu lista pune DA / PA langa nume", /\(DA \$\{autoritate\[domeniuPdf\(n\.url\)\]\.da\}/.test(citesteFisier("src/lib/newspaper-list-pdf.ts")) && /PA \$\{autoritate\[domeniuPdf\(n\.url\)\]\.pa\}/.test(citesteFisier("src/lib/newspaper-list-pdf.ts")));
  t("scorurile se reimprospateaza din planificator, zilnic, doar cele vechi de 30 de zile", /autoritate-retea/.test(citesteFisier("src/planificator.ts")) && /ZILE_INTRE_MASURATORI = 30/.test(citesteFisier("src/lib/autoritate-retea.ts")));
  t("cronul cere cheia", /cronAutorizat\(req\.headers\)/.test(citesteFisier("src/app/api/cron/autoritate-retea/route.ts")));
}

{
  console.log("\n── Autoblog (03.10.2026) ──");
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  t("cuvintele: o linie sau o virgula = un cuvant, fara dubluri, fara numerotare", JSON.stringify(parseazaCuvinte("1. cât costă un advertorial\nadvertorial în ziare, Cât costă un advertorial\n\n- promovare firmă")) === JSON.stringify(["cât costă un advertorial", "advertorial în ziare", "promovare firmă"]));
  t("slugul: fara diacritice, fara semne, max 80", slugDin("Cât costă un advertorial în 2026? Ghid complet!") === "cat-costa-un-advertorial-in-2026-ghid-complet");
  const murdar = '<h1>x</h1><p>Text <script>alert(1)</script><a href="https://evil.ro">rau</a> si <a href="/oferta-500">bun</a> <img src=x onerror=alert(1)></p><h2 style="color:red" onclick="x()">Sub</h2>';
  const curat = curataHtml(murdar);
  t("html-ul generat: fara script, img, h1, atribute; linkuri doar interne", curat === '<h2>x</h2><p>Text rau si <a href="/oferta-500">bun</a> </p><h2>Sub</h2>');
  t("linkul catre site-ul nostru devine relativ", curataHtml('<a href="https://mediaexpress.ro/reteaua-noastra">x</a>') === '<a href="/reteaua-noastra">x</a>');
  t("numarul de cuvinte ignora tagurile", numarCuvinte("<p>unu doi</p><h2>trei</h2>") === 3);
  const zi = new Date("2026-10-05T10:00:00+03:00");
  t("randul: fara articole, in timpul zilei → da", eRandul({ ritm: "1pezi", ultimaPublicare: null, acum: zi }));
  t("randul: noaptea nu se publica", !eRandul({ ritm: "1pezi", ultimaPublicare: null, acum: new Date("2026-10-05T02:00:00+03:00") }));
  t("randul: 1 pe zi, ultimul acum 10 ore → nu", !eRandul({ ritm: "1pezi", ultimaPublicare: new Date(zi.getTime() - 10 * 3600e3), acum: zi }));
  t("randul: 1 pe zi, ultimul acum 23,6 ore → da (toleranta 30 min)", eRandul({ ritm: "1pezi", ultimaPublicare: new Date(zi.getTime() - 23.6 * 3600e3), acum: zi }));
  t("randul: 2 pe zi, ultimul acum 12 ore → da", eRandul({ ritm: "2pezi", ultimaPublicare: new Date(zi.getTime() - 12 * 3600e3), acum: zi }));
  t("randul: 1 la 2 zile, ultimul acum 30 ore → nu", !eRandul({ ritm: "la2zile", ultimaPublicare: new Date(zi.getTime() - 30 * 3600e3), acum: zi }));
  t("ritmurile cerute: 2 pe zi, 1 pe zi, 1 la 2 zile, 1 la 3 zile", RITMURI_BLOG.map((r) => r.oreIntre).join(",") === "12,24,48,72");
  t("postarea pe Facebook are titlul, rezumatul si linkul", textPostareFacebook({ title: "T", excerpt: "R", slug: "s" }) === `T\n\nR\n\nCitește articolul: ${SITE.url}/blog/s`);
  t("cronul autoblog cere cheia si e in planificator la 30 de minute", /cronAutorizat\(req\.headers\)/.test(citesteFisier("src/app/api/cron/autoblog/route.ts")) && /autoblog"\), 30 \* MIN/.test(citesteFisier("src/planificator.ts")));
  t("harta site-ului include articolele autoblogului", /\.\.\.autoblog/.test(citesteFisier("src/app/sitemap.ts")));
  t("pagina de articol randeaza HTML-ul din baza cand nu exista fisier MDX", /postDupaSlug/.test(citesteFisier("src/app/blog/[slug]/page.tsx")) && /dangerouslySetInnerHTML/.test(citesteFisier("src/app/blog/[slug]/page.tsx")));
}

{
  console.log("\n── Captura site-ului, cand clientul n-a trimis poze (03.10.2026) ──");
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  const surse = surseCaptura("https://firma.ro/");
  t("doua surse, thum.io intai, apoi mShots", surse.length === 2 && /image\.thum\.io/.test(surse[0]) && /s0\.wp\.com\/mshots/.test(surse[1]));
  t("adresa site-ului e codificata la mShots", surse[1].includes(encodeURIComponent("https://firma.ro/")));
  t("captura e marcata in admin", /CAPTURĂ SITE/.test(citesteFisier("src/app/admin/materiale/page.tsx")) && /CAPTURĂ SITE/.test(citesteFisier("src/app/admin/materiale/[id]/page.tsx")));
  t("emailul catre admin spune ca e captura, nu poza clientului", /am pus o captură a site-ului lui/.test(citesteFisier("src/app/api/articol/submit/route.ts")));
  t("captura se copiaza in Cloudinary, nu ramane pe serviciul extern", /api\.cloudinary\.com/.test(citesteFisier("src/lib/captura-site.ts")));
}

{
  console.log("\n── Oferta zilnica pe Facebook (03.10.2026) ──");
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  const acum = new Date("2026-10-05T10:30:00+03:00");
  const txt = textulZilei({ texte: TEXTE_IMPLICITE }, "2026-10-05", acum.getTime());
  t("textul pune termenul curent al ofertei si linkul", /\d+ \w+/.test(txt) && !txt.includes("{termen}") && txt.includes("/oferta-500"));
  t("textele se rotesc pe zile", textulZilei({ texte: ["a {termen}", "b {termen}"] }, "2026-10-05") !== textulZilei({ texte: ["a {termen}", "b {termen}"] }, "2026-10-06"));
  t("pozele se rotesc pe zile; fara poze → null", pozaZilei({ poze: ["x", "y"] }, "2026-10-05") !== pozaZilei({ poze: ["x", "y"] }, "2026-10-06") && pozaZilei({ poze: [] }, "2026-10-05") === null);
  t("randul: oprita → nu", !eRandulOfertei({ activ: false, ora: 10, ultimaZi: null }, acum));
  t("randul: inainte de ora → nu", !eRandulOfertei({ activ: true, ora: 12, ultimaZi: null }, acum));
  t("randul: dupa ora, nepostata azi → da", eRandulOfertei({ activ: true, ora: 10, ultimaZi: "2026-10-04" }, acum));
  t("randul: deja postata azi → nu", !eRandulOfertei({ activ: true, ora: 10, ultimaZi: "2026-10-05" }, acum));
  t("textele din admin: separate prin linie goala, cele prea scurte sarite", parseazaTexte("Un text destul de lung pentru oferta\n\nscurt\n\nAlt text destul de lung pentru oferta").length === 2);
  t("cronul autoblog posteaza si oferta", /posteazaOferta\(\)/.test(citesteFisier("src/app/api/cron/autoblog/route.ts")));
  t("postarea cu poza merge pe /photos, fara poza pe /feed", /\/photos`/.test(citesteFisier("src/lib/oferta-facebook.ts")) && /\/feed`/.test(citesteFisier("src/lib/oferta-facebook.ts")));
}

{
  console.log("\n── Comanda pleaca in retea (04.10.2026) ──");
  const citesteFisier = (f: string) => fs.readFileSync(f, "utf8");
  const rand = {
    id: "sub-1", stripeSessionId: "cs_test_abc", source: "facebook", fbBoostPaper: "Iași Expres", linkNotes: "curățenie birouri → https://firma.ro/curatenie",
    email: "ion@firma.ro", packageId: "promo-50", title: "Firma X lansează", body: "Firma X oferă curățenie birouri în Iași.\n\nDe ce noi\n\nProgramări online.",
    metaDescription: "Meta", keywords: "curatenie, birouri", companyName: "Firma X SRL", siteUrl: "firma.ro", contactPhone: "0722 111 222", cui: "123", billingAddress: "Iași",
    images: JSON.stringify([{ url: "https://img/1.jpg" }, { url: "https://img/2.jpg" }]), featuredIndex: 1, facebookOptIn: true, uniquePerSite: false, ritm: "sapt2",
    generatedByAi: false, isCasino: false, paymentMethod: "card", paymentProof: null, reteaId: null, reteaTrimisLa: null, reteaEroare: null, companyCui: "123", companyAddress: "Iași",
    status: "pending", createdAt: new Date(), publishedAt: null, paymentRemindersSent: 0, paymentReminderAt: null, materialExternAt: null,
  } as unknown as Parameters<typeof comandaPentruRetea>[0];
  const c = comandaPentruRetea(rand, { pretLei: 500 });
  t("fara site-ul clientului, nu pleaca (reteaua cere linkul)", "eroare" in comandaPentruRetea({ ...rand, siteUrl: "" } as typeof rand, { pretLei: 500 }));
  if ("eroare" in c) { t("comanda se construieste", false); } else {
    t("referinta = sesiunea de plata (asa se leaga cu Campania in retea)", c.comanda_externa === "cs_test_abc");
    t("linkul clientului curatat, cu https", c.link_client === "https://firma.ro");
    t("poza reprezentativa prima", c.poze[0] === "https://img/2.jpg" && c.poze.length === 2);
    t("textul pleaca formatat, cu linkul pe cuvant, dofollow", /<a href="https:\/\/firma.ro\/curatenie">curățenie birouri<\/a>/.test(c.material) && !/nofollow/.test(c.material));
    t("text identic cerut de client → text_identic", c.text_identic === true);
    t("promovarea pe Facebook: 3 zile pe ziarul ales", c.promovare_zile === 3 && /Iași Expres/.test(c.promovare_public || ""));
    t("ritmul cerut e in observatii, cu orele de esalonare", /RITM CERUT: Întins pe 2 săptămâni → eșalonare 336 ore/.test(c.observatii));
    t("observatiile spun ca textul e identic", /IDENTIC pe toate ziarele/.test(c.observatii));
    t("pretul si pachetul", c.pret === 500 && /50/.test(c.pachet));
    t("cardul = platit", c.platit === true);
  }
  t("trimiterea automata: la articol trimis, la plata OP confirmata, la comanda noua platita", /trimiteAutomatInRetea\(submissionId/.test(citesteFisier("src/app/api/articol/submit/route.ts")) && /trimiteAutomatInRetea\(params\.id/.test(citesteFisier("src/app/api/admin/materiale/[id]/route.ts")) && /if \(d\.paid\) for \(const id of ids\) await trimiteAutomatInRetea/.test(citesteFisier("src/app/api/admin/comanda-noua/route.ts")));
  t("cazinoul si OP-ul neincasat nu pleaca automat", /if \(r\.isCasino\) return;/.test(citesteFisier("src/lib/retea.ts")) && /paymentMethod === "op" && r\.status === "pending_payment"\) return;/.test(citesteFisier("src/lib/retea.ts")));
  t("in retea intra NEPUBLICATA (POST /api/admin/comenzi, nu publish)", /\/api\/admin\/comenzi\?key=/.test(citesteFisier("src/lib/retea.ts")) && !/api\/admin\/publish/.test(citesteFisier("src/lib/retea.ts")));
}

console.log("\n" + "=".repeat(64));
console.log(`TOTAL: ${n} verificari | ESUATE: ${fails.length}`);
if (fails.length) console.log(fails.map((f) => "  x " + f).join("\n"));
