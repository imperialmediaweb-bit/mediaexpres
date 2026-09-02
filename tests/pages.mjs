import { chromium } from "playwright-core";

const B = "http://localhost:3000";
const PAGES = [
  ["/", "acasa"],
  ["/oferta-500", "LANDING reclama"],
  ["/comanda/transfer?pachet=promo-50", "flux OP"],
  ["/pachete", "pachete"],
  ["/reteaua-noastra", "reteaua"],
  ["/comanda", "comanda"],
  ["/contact", "contact"],
  ["/blog", "blog"],
  ["/sabloane", "sabloane"],
  ["/despre", "despre"],
  ["/judet/cluj", "judet"],
  ["/publicare-comunicat-cluj", "REWRITE judet"],
  ["/industrie/imobiliare", "industrie"],
  ["/comunicate-presa-imobiliare", "REWRITE industrie"],
  ["/generator-comunicat", "generator"],
  ["/audit-mentiuni", "audit"],
  ["/parteneriat", "parteneriat"],
  ["/legal/termeni", "termeni"],
  ["/legal/gdpr", "gdpr"],
  ["/sitemap.xml", "sitemap"],
  ["/robots.txt", "robots"],
  ["/admin/login", "admin login"],
  ["/cont/login", "cont login"],
  ["/cont/mesaje", "cont mesaje"],
  ["/cont/rapoarte", "cont rapoarte"],
  ["/admin/mesaje", "admin mesaje"],
  ["/admin/materiale", "admin materiale"],
];

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const bad = [];
let errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));

console.log("PAGINA".padEnd(40) + "COD  ERORI JS");
console.log("-".repeat(62));
for (const [path, label] of PAGES) {
  errs = [];
  let st = 0;
  try {
    const r = await p.goto(B + path, { waitUntil: "domcontentloaded", timeout: 20000 });
    st = r?.status() ?? 0;
    await p.waitForTimeout(300);
  } catch {
    st = -1;
    errs.push("NAVIGARE ESUATA");
  }
  const real = errs.filter((e) => !/TUNNEL|ERR_/.test(e));
  if (st !== 200 || real.length) bad.push(`${path} (${label}) -> ${st} ${real[0] || ""}`);

  // AUDITUL AUTOMAT DE CONTINUT — pe textul RANDAT, nu pe surse.
  //
  // De ce exista: fiecare schimbare de conditii comerciale a lasat in urma
  // texte pe regula veche, gasite abia la cate un audit de mana ("proforma"
  // traia in 6 locuri la luni dupa ce s-a renuntat la ea; "factura dupa
  // publicare" promitea ordinea inversa a fluxului). Un audit de mana prinde
  // ce cauta omul in ziua aia; asta cauta ACELEASI lucruri la fiecare rulare,
  // pe fiecare pagina, inclusiv in textele asamblate la runtime pe care un
  // grep pe surse nu le vede. Lista creste cu fiecare regula care se schimba.
  if (st === 200 && !/sitemap|robots/.test(path) && !path.startsWith("/admin") && !path.startsWith("/cont")) {
    const text = await p.evaluate(() => document.body?.innerText || "");
    const INTERZISE = [
      [/proform/i, "proforma nu mai exista — direct factura fiscala"],
      // Facturarea automata NU merge (StartCo refuza mereu): factura o
      // emite proprietarul de mana, in program. „Imediat" si „automat"
      // sunt promisiuni pe care site-ul nu le poate tine.
      [/factur[aă][^.]{0,40}imediat după comandă/i, "factura nu vine imediat — o emite proprietarul de mana"],
      [/factura se emite automat/i, "facturarea automata nu functioneaza"],
      [/mâine ai raportul/i, "maine nu inseamna 12 ore lucratoare (vineri → luni)"],
      [/\b[îi]n (maximum )?4 ore\b/i, "promisiunea veche de 4 ore"],
      [/\b224\s*(de )?(h|ore)\b/i, "cifra stricata 224"],
      [/\b24 de ore lucr/i, "termenul vechi de 24 de ore — acum e 12 ore lucratoare"],
      [/1\.200\s*(de\s*)?articole|1\.200\+/i, "cifra veche de articole pe zi — acum e circa 600"],
      [/lucr[ăa]toare\s+lucr[ăa]toare/i, "cuvant dublat"],
      [/320\.000|320k|vizitatori unici/i, "cifre de vizitatori — nu le mai folosim"],
      [/ziare(le|lor)? partenere|site-uri(le)? partenere/i, "ziarele sunt PROPRII, nu partenere"],
      [/factur[ăa][^.!?]{0,60}după publicare/i, "ordinea e factura -> plata -> publicare"],
      [/plata (se face )?după publicare/i, "ordinea e factura -> plata -> publicare"],
      [/odat[ăa] cu dovada pl[ăa][țt]ii/i, "dovada platii nu mai e ceruta la comanda"],
      [/f[ăa] plata [îi]n contul nostru|după ce ai făcut plata/i, "plata nu se cere inaintea facturii"],
      [/după plată, trimite/i, "plata nu se cere inaintea facturii"],
    ];
    for (const [re, motiv] of INTERZISE) {
      const m = text.match(re);
      if (m) bad.push(`${path}: ${motiv} → "${m[0]}"`);
    }
  }

  console.log(`${path.padEnd(40)}${String(st).padStart(3)}  ${real.length ? real[0] : ""}`);
}

console.log("\n" + (bad.length ? "PROBLEME:\n" + bad.join("\n") : "TOATE PAGINILE OK"));
await b.close();
