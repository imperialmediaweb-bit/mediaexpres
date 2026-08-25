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
  console.log(`${path.padEnd(40)}${String(st).padStart(3)}  ${real.length ? real[0] : ""}`);
}

console.log("\n" + (bad.length ? "PROBLEME:\n" + bad.join("\n") : "TOATE PAGINILE OK"));
await b.close();
