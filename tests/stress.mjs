// Testul de rezistenta al fluxului de comanda de pe /oferta-500.
//
// Suita `flows.mjs` trece o data prin fiecare drum. Aici trecem de N ori
// (implicit 100), alternand telefon/desktop si 13 scenarii — fericite si
// nefericite — si verificam de fiecare data un singur lucru, cel care a
// costat comenzi: ORICE apasare de buton produce fie un pas inainte, fie
// un mesaj in romana, vizibil, langa butonul apasat, neacoperit de bara
// fixa sau de bulele de chat/WhatsApp. Niciodata tacere.
//
//   node tests/stress.mjs        # 100 de iteratii
//   node tests/stress.mjs 20     # mai putine, la depanare
import { chromium } from "playwright-core";

const B = "http://localhost:3000";
const N = Number(process.argv[2] || 100);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

const fails = [];
const perScenario = {};
const t0 = Date.now();

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const emails = [
  "ion@firma.ro",
  "  Maria.Pop@Firma.RO ",
  "office@tomis-computers.ro",
  "contact@sc-granit-negru.ro",
  "andrei.ionescu+test@gmail.com",
  "a@b.co",
];
const emailsRele = ["ion@firma", "ion.firma.ro", "@firma.ro", "ion@", "ion @firma.ro", ""];

function rnd(arr, i) {
  return arr[i % arr.length];
}
function lorem(n) {
  const s =
    "Firma noastră lansează un nou serviciu pentru clienții din județ, cu livrare rapidă și consultanță gratuită la prima comandă. ";
  let out = "";
  while (out.length < n) out += s;
  return out.slice(0, n);
}

/** Mesajul trebuie sa fie vizibil, in ecran, langa buton si neacoperit. */
async function mesajLangaButon(p, text, btnLocator) {
  const el = p.locator(`text=${text}`).first();
  if (!(await el.isVisible().catch(() => false))) return { ok: false, de_ce: "mesajul nu e vizibil" };
  const a = await el.boundingBox();
  const c = await btnLocator.boundingBox();
  if (!a || !c) return { ok: false, de_ce: "fara bounding box" };
  const d = Math.abs(a.y - c.y);
  if (d > 260) return { ok: false, de_ce: `mesajul e la ${Math.round(d)}px de buton` };
  const vh = p.viewportSize().height;
  if (a.y < 0 || a.y + a.height > vh) return { ok: false, de_ce: `mesajul iese din ecran (y=${Math.round(a.y)}, vh=${vh})` };
  // Nimic fix (bara de comanda, chat, WhatsApp) nu are voie peste mesaj.
  const acoperit = await p.evaluate(({ x, y, w, h }) => {
    const fixe = [...document.querySelectorAll("*")].filter((el) => {
      const cs = getComputedStyle(el);
      return (cs.position === "fixed" || cs.position === "sticky") && cs.visibility !== "hidden" && cs.display !== "none";
    });
    for (const el of fixe) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const ix = Math.max(0, Math.min(x + w, r.right) - Math.max(x, r.left));
      const iy = Math.max(0, Math.min(y + h, r.bottom) - Math.max(y, r.top));
      if (ix * iy > 0.15 * w * h) return el.tagName + "." + [...el.classList].slice(0, 3).join(".");
    }
    return null;
  }, { x: a.x, y: a.y, w: a.width, h: a.height });
  if (acoperit) return { ok: false, de_ce: `mesajul e acoperit de ${acoperit}` };
  return { ok: true, d: Math.round(d) };
}

async function deschideOferta(p, { ultimul = false } = {}) {
  await p.goto(B + "/oferta-500", { waitUntil: "domcontentloaded" });
  const btns = p.getByRole("button", { name: /Comandă acum — |Abonează-te — / });
  await btns.first().waitFor({ timeout: 15000 });
  const btn = ultimul ? btns.last() : btns.first();
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  // formularul de email apare in locul butonului apasat
  const form = ultimul
    ? p.locator('form:has(input[name="contentDeclaration"])').last()
    : p.locator('form:has(input[name="contentDeclaration"])').first();
  await form.waitFor({ timeout: 5000 });
  return form;
}

const SCENARII = [
  // 0 — card, drum fericit, pana pe pagina de dupa Stripe (aici, cea de anulare)
  async (p, i, ctx) => {
    const form = await deschideOferta(p);
    await form.locator('input[type="email"]').fill(rnd(emails, i));
    await form.locator('input[name="contentDeclaration"]').check();
    await form.getByRole("button", { name: /Card — plătesc acum/ }).click();
    await p.waitForURL(/\/comanda\/anulat\?pachet=promo-50/, { timeout: 10000 });
    const sent = ctx.checkout.at(-1);
    if (!sent || sent.packageId !== "promo-50" || sent.mode !== "package") throw new Error(`payload gresit: ${JSON.stringify(sent)}`);
    if (sent.email !== rnd(emails, i).trim()) throw new Error(`emailul nu e cel scris/curatat: ${sent.email}`);
    // pagina de anulare ofera OP pentru ACELASI pachet, nu „vezi pachete"
    const op = p.locator('a[href*="/comanda/transfer?pachet=promo-50"]');
    if (!(await op.isVisible())) throw new Error("pagina de anulare nu ofera OP pentru promo-50");
    if (!/500 lei/.test(await op.innerText())) throw new Error("butonul OP nu arata pretul");
  },
  // 1 — card fara email
  async (p) => {
    const form = await deschideOferta(p);
    await form.locator('input[type="email"]').fill("");
    const btn = form.getByRole("button", { name: /Card — plătesc acum/ });
    await btn.click();
    await p.waitForTimeout(700);
    const r = await mesajLangaButon(p, "Scrie o adresă de email validă", btn);
    if (!r.ok) throw new Error(`fara email: ${r.de_ce}`);
  },
  // 2 — card cu email gresit
  async (p, i) => {
    const form = await deschideOferta(p);
    await form.locator('input[type="email"]').fill(rnd(emailsRele, i));
    const btn = form.getByRole("button", { name: /Card — plătesc acum/ });
    await btn.click();
    await p.waitForTimeout(700);
    const r = await mesajLangaButon(p, "Scrie o adresă de email validă", btn);
    if (!r.ok) throw new Error(`email „${rnd(emailsRele, i)}": ${r.de_ce}`);
  },
  // 3 — card fara declaratie
  async (p, i) => {
    const form = await deschideOferta(p);
    await form.locator('input[type="email"]').fill(rnd(emails, i));
    const btn = form.getByRole("button", { name: /Card — plătesc acum/ });
    await btn.click();
    await p.waitForTimeout(700);
    const r = await mesajLangaButon(p, "Bifează declarația", btn);
    if (!r.ok) throw new Error(`fara declaratie: ${r.de_ce}`);
  },
  // 4 — OP, drum fericit, pana la „Am primit comanda ta" (server real)
  async (p, i) => {
    const form = await deschideOferta(p);
    const email = `stress-${Date.now()}-${i}@test.ro`;
    await form.locator('input[type="email"]').fill(email);
    await form.locator('input[name="contentDeclaration"]').check();
    await form.locator('a[href*="/comanda/transfer"]').click();
    await p.waitForURL(/\/comanda\/transfer\?pachet=promo-50&email=/, { timeout: 10000 });
    const pre = await p.locator('input[type="email"]').first().inputValue();
    if (pre !== email) throw new Error(`emailul nu e precompletat pe OP: „${pre}"`);
    await completeazaOP(p, { body: lorem(140 + (i % 60)) });
    await p.getByRole("button", { name: /Trimite comanda/ }).click();
    await p.locator("text=Am primit comanda ta").waitFor({ timeout: 15000 });
  },
  // 5 — OP fara declaratie (in oferta)
  async (p, i) => {
    const form = await deschideOferta(p);
    await form.locator('input[type="email"]').fill(rnd(emails, i));
    const op = form.locator('a[href*="/comanda/transfer"]');
    await op.click();
    await p.waitForTimeout(700);
    if (/\/comanda\/transfer/.test(p.url())) throw new Error("OP a plecat fara declaratie");
    const r = await mesajLangaButon(p, "Bifează declarația", op);
    if (!r.ok) throw new Error(`OP fara declaratie: ${r.de_ce}`);
  },
  // 6 — formularul OP direct: fiecare camp lipsa isi spune numele, in romana
  async (p, i) => {
    await p.goto(B + "/comanda/transfer?pachet=promo-50", { waitUntil: "domcontentloaded" });
    const btn = p.getByRole("button", { name: /Trimite comanda/ });
    await btn.waitFor({ timeout: 15000 });
    await completeazaOP(p, { body: lorem(150), cui: "" });
    await btn.click();
    await p.waitForTimeout(700);
    let r = await mesajLangaButon(p, "Scrie CUI-ul firmei", btn);
    if (!r.ok) throw new Error(`fara CUI: ${r.de_ce}`);
    await p.locator('input[placeholder="RO12345678"]').fill("RO123456");
    await p.locator("textarea").first().fill(lorem(60));
    await btn.click();
    await p.waitForTimeout(700);
    r = await mesajLangaButon(p, "minimum 100 de caractere", btn);
    if (!r.ok) throw new Error(`text scurt: ${r.de_ce}`);
    // fara titlu — trebuie sa treaca (il propunem noi)
    await p.locator("textarea").first().fill(lorem(160));
    await btn.click();
    await p.locator("text=Am primit comanda ta").waitFor({ timeout: 15000 });
    void i;
  },
  // 7 — cazino: pret 1.000 si pachetul corect la Stripe
  async (p, i, ctx) => {
    await p.goto(B + "/oferta-500", { waitUntil: "domcontentloaded" });
    await p.getByRole("button", { name: /Comandă acum — / }).first().waitFor({ timeout: 15000 });
    const det = p.locator("details:has-text('cazino')").first();
    await det.locator("summary").click();
    await det.locator('input[type="checkbox"]').check();
    const btn = p.getByRole("button", { name: /Comandă acum — 1\.000 lei/ }).first();
    if (!(await btn.isVisible())) throw new Error("pretul de cazino (1.000) nu apare pe buton");
    await btn.click();
    const form = p.locator('form:has(input[name="contentDeclaration"])').first();
    await form.waitFor({ timeout: 5000 });
    await form.locator('input[type="email"]').fill(rnd(emails, i));
    await form.locator('input[name="contentDeclaration"]').check();
    await form.getByRole("button", { name: /Card — plătesc acum/ }).click();
    await p.waitForURL(/\/comanda\/anulat/, { timeout: 10000 });
    const sent = ctx.checkout.at(-1);
    if (sent?.packageId !== "promo-50-cazino") throw new Error(`cazino: pachet gresit ${JSON.stringify(sent)}`);
  },
  // 8 — abonament lunar: doar card, pachetul lunar
  async (p, i, ctx) => {
    await p.goto(B + "/oferta-500", { waitUntil: "domcontentloaded" });
    await p.getByRole("button", { name: /Comandă acum — / }).first().waitFor({ timeout: 15000 });
    await p.getByRole("button", { name: "Abonament lunar" }).first().click();
    const btn = p.getByRole("button", { name: /Abonează-te — 400 lei/ }).first();
    await btn.waitFor({ timeout: 3000 });
    await btn.click();
    const form = p.locator('form:has(input[name="contentDeclaration"])').first();
    await form.waitFor({ timeout: 5000 });
    if (await form.locator('a[href*="/comanda/transfer"]').count()) throw new Error("abonamentul ofera OP (nu se poate)");
    await form.locator('input[type="email"]').fill(rnd(emails, i));
    await form.locator('input[name="contentDeclaration"]').check();
    await form.getByRole("button", { name: /Card — plătesc acum/ }).click();
    await p.waitForURL(/\/comanda\/anulat/, { timeout: 10000 });
    const sent = ctx.checkout.at(-1);
    if (sent?.mode !== "subscription-standard" || sent?.packageId !== "promo-lunar") throw new Error(`lunar: ${JSON.stringify(sent)}`);
  },
  // 9 — Enter in campul de email trimite (nu doar clickul)
  async (p, i, ctx) => {
    const form = await deschideOferta(p);
    await form.locator('input[name="contentDeclaration"]').check();
    const inp = form.locator('input[type="email"]');
    await inp.fill(rnd(emails, i));
    await inp.press("Enter");
    await p.waitForURL(/\/comanda\/anulat/, { timeout: 10000 });
    if (!ctx.checkout.length) throw new Error("Enter nu a trimis");
  },
  // 10 — dublu click: o singura cerere la Stripe
  async (p, i, ctx) => {
    const form = await deschideOferta(p);
    await form.locator('input[type="email"]').fill(rnd(emails, i));
    await form.locator('input[name="contentDeclaration"]').check();
    const btn = form.getByRole("button", { name: /Card — plătesc acum/ });
    await btn.click({ clickCount: 2, delay: 30 }).catch(() => {});
    await p.waitForURL(/\/comanda\/anulat/, { timeout: 10000 });
    if (ctx.checkout.length !== 1) throw new Error(`dublu click → ${ctx.checkout.length} cereri de checkout`);
  },
  // 11 — butonul din CTA-ul final (a doua instanta) merge la fel
  async (p, i, ctx) => {
    const form = await deschideOferta(p, { ultimul: true });
    await form.locator('input[type="email"]').fill(rnd(emails, i));
    await form.locator('input[name="contentDeclaration"]').check();
    const btn = form.getByRole("button", { name: /Card — plătesc acum/ });
    // eroarea trebuie sa apara si aici, langa butonul de JOS
    await form.locator('input[name="contentDeclaration"]').uncheck();
    await btn.click();
    await p.waitForTimeout(700);
    const r = await mesajLangaButon(p, "Bifează declarația", btn);
    if (!r.ok) throw new Error(`CTA final, fara declaratie: ${r.de_ce}`);
    await form.locator('input[name="contentDeclaration"]').check();
    await btn.click();
    await p.waitForURL(/\/comanda\/anulat/, { timeout: 10000 });
    if (ctx.checkout.at(-1)?.packageId !== "promo-50") throw new Error("CTA final: pachet gresit");
  },
  // 12 — serverul cade: mesaj in romana, langa buton, si butonul se reactiveaza
  async (p, i, ctx) => {
    ctx.checkoutFails = true;
    const form = await deschideOferta(p);
    await form.locator('input[type="email"]').fill(rnd(emails, i));
    await form.locator('input[name="contentDeclaration"]').check();
    const btn = form.getByRole("button", { name: /Card — plătesc acum/ });
    await btn.click();
    await p.waitForTimeout(700);
    const r = await mesajLangaButon(p, "Stripe nu răspunde", btn);
    if (!r.ok) throw new Error(`eroare de server: ${r.de_ce}`);
    if (await btn.isDisabled()) throw new Error("butonul ramane blocat dupa eroare");
  },
];

async function completeazaOP(p, { body, cui = "RO123456" }) {
  const emailInp = p.locator('input[type="email"]').first();
  if (!(await emailInp.inputValue())) await emailInp.fill(`stress-${Date.now()}@test.ro`);
  await p.locator('input[type="tel"]').fill("0745123456");
  await p.locator('input[placeholder="Firma Mea SRL"]').fill("Stress Test SRL");
  await p.locator('input[placeholder="RO12345678"]').fill(cui);
  await p.locator('input[placeholder="Str., nr., oraș, județ"]').fill("Str. Testului 1, București");
  await p.locator("textarea").first().fill(body);
  await p.locator('input[name="contentDeclaration"]').check();
}

for (let i = 0; i < N; i++) {
  const mobil = i % 2 === 0;
  const s = i % SCENARII.length;
  const nume = `#${i} ${mobil ? "mobil" : "desktop"} scenariu ${s}`;
  // Doar viewport-ul de telefon, fara `isMobile`: emularea Chromium muta
  // viewport-ul vizual fata de cel de layout (innerHeight 1676 la 844 de
  // pixeli reali) si hit-testing-ul Playwright nimereste alt element decat
  // cel de sub deget — un artefact al emularii, nu al paginii. Punctele de
  // rupere CSS, singurul lucru care conteaza aici, depind doar de latime.
  const ctx = await b.newContext({
    viewport: mobil ? { width: 390, height: 844 } : { width: 1280, height: 900 },
  });
  const p = await ctx.newPage();
  const stare = { checkout: [], checkoutFails: false };
  const erori = [];
  p.on("pageerror", (e) => erori.push("pageerror: " + e.message));
  // Analiticele externe nu trec prin proxy-ul cutiei de test si ar tine
  // pagina in „loading" la nesfarsit; le taiem. Serverul local ramane real.
  await p.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await p.route("**/api/checkout", async (r) => {
    stare.checkout.push(JSON.parse(r.request().postData() || "{}"));
    if (stare.checkoutFails) {
      await r.fulfill({ status: 502, json: { ok: false, error: "Stripe nu răspunde. Încearcă din nou sau alege ordinul de plată." } });
    } else {
      await r.fulfill({ json: { ok: true, url: B + "/comanda/anulat?pachet=" + (stare.checkout.at(-1).packageId || "promo-50") } });
    }
  });
  await p.route("**/api/oferta/continua", (r) => r.fulfill({ json: { ok: true } }));

  const t = Date.now();
  try {
    await SCENARII[s](p, i, stare);
    if (erori.length) throw new Error(erori.join(" | "));
    perScenario[s] = (perScenario[s] || 0) + 1;
    process.stdout.write(`  OK   ${nume} (${Date.now() - t}ms)\n`);
  } catch (e) {
    const msg = process.env.DEBUG
      ? String(e.message || e).slice(0, 1500)
      : String(e.message || e).split("\n")[0].slice(0, 200);
    fails.push(`${nume}: ${msg}`);
    process.stdout.write(` FAIL  ${nume}: ${msg}\n`);
    try {
      await p.screenshot({ path: `/tmp/claude-0/-home-user/ab7e5911-6425-5af0-b251-537fbc61eed5/scratchpad/stress-fail-${i}.png`, fullPage: false });
    } catch {}
  } finally {
    await ctx.close();
  }
}
await b.close();

console.log("\n" + "=".repeat(60));
console.log(`${N} iteratii in ${Math.round((Date.now() - t0) / 1000)}s — ${N - fails.length} OK, ${fails.length} FAIL`);
console.log("pe scenariu:", Object.entries(perScenario).map(([k, v]) => `${k}:${v}`).join("  "));
if (fails.length) {
  console.log("\nESUATE:");
  for (const f of fails) console.log("  - " + f);
  process.exit(1);
}
console.log("TOATE ITERATIILE AU TRECUT");
