import { chromium } from "playwright-core";

const B = "http://localhost:3000";
const S = "/tmp/claude-0/-home-user/ab7e5911-6425-5af0-b251-537fbc61eed5/scratchpad";
const fails = [];
function check(ok, msg) {
  console.log(`${ok ? "  OK  " : " FAIL "} ${msg}`);
  if (!ok) fails.push(msg);
}

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

// ---------- DESKTOP: fluxul de comanda ----------
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__fbq = [];
    Object.defineProperty(window, "fbq", {
      configurable: true,
      set() {},
      get() {
        const f = (...a) => window.__fbq.push(a);
        f.queue = []; f.loaded = true; f.version = "2.0"; f.push = f; f.callMethod = null;
        return f;
      },
    });
  });
  let sent = null;
  await p.route("**/api/checkout", async (r) => {
    sent = r.request().postDataJSON();
    await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, url: B + "/?fake" }) });
  });

  console.log("\n=== 1. Oferta: preturi si sincronizare ===");
  await p.goto(B + "/oferta-500", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1400);

  const cta = p.getByRole("button", { name: /Comandă acum — [\d.]+ lei/ });
  const n = await cta.count();
  check(n >= 1, `butoane de comanda: ${n}`);
  const labels = [];
  for (let i = 0; i < n; i++) labels.push((await cta.nth(i).innerText()).trim());
  check(labels.every((l) => /500/.test(l)), "toate arata 500 lei");

  const cb = p.locator('input[type="checkbox"]').first();
  await cb.check({ force: true });
  await p.waitForTimeout(500);
  const l2 = [];
  const n2 = await cta.count();
  for (let i = 0; i < n2; i++) l2.push((await cta.nth(i).innerText()).trim());
  check(n2 > 0 && l2.every((l) => /1\.?000/.test(l)), "cazino: 1.000 lei pe TOATE butoanele");
  await cb.uncheck({ force: true });
  await p.waitForTimeout(400);

  console.log("\n=== 2. Pasii de dupa plata, vizibili inainte de plata ===");
  const txt = await p.locator("body").innerText();
  check(/ce se întâmplă după plată/i.test(txt), "blocul cu pasii apare");
  check(txt.includes("Îl scriem noi"), "scrie ca redactam noi articolul");
  check(txt.includes("transfer bancar (OP)"), "varianta OP mentionata");

  console.log("\n=== 3. Email inainte de Stripe + pixel ===");
  await cta.first().click();
  await p.waitForTimeout(700);
  check((await p.locator('input[type="email"]').count()) > 0, "campul de email apare");
  const calls = await p.evaluate(() => window.__fbq);
  check(calls.filter((c) => c[1] === "InitiateCheckout").length === 1, "pixel InitiateCheckout trimis la click");
  await p.locator('input[type="email"]').first().fill("gresit");
  await p.getByRole("button", { name: /Continuă spre plată/ }).first().click();
  await p.waitForTimeout(400);
  check(sent === null, "email invalid: blocat local, fara cerere la server");
  await p.locator('input[type="email"]').first().fill("test@firma.ro");
  await p.getByRole("button", { name: /Continuă spre plată/ }).first().click();
  await p.waitForTimeout(900);
  check(sent?.email === "test@firma.ro" && sent?.packageId === "promo-50", `trimis la server: ${JSON.stringify(sent)}`);

  console.log("\n=== 4. Consultant + WhatsApp + lista ===");
  await p.goto(B + "/oferta-500", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  check((await p.getByRole("button", { name: /Ai o întrebare/ }).count()) === 1, "bula de consultant exista");
  check((await p.locator('a[aria-label*="WhatsApp"]').count()) === 1, "buton WhatsApp exista");
  const ziare = await p.locator('a[rel="noopener"][target="_blank"]').count();
  check(ziare >= 50, `lista ziarelor pe pagina: ${ziare} linkuri`);
  check((await p.locator('a[href*="/comanda/transfer"]').count()) >= 1, "link catre fluxul OP");
  await p.close();
}

// ---------- FLUXUL OP ----------
{
  const p = await (await b.newContext({ viewport: { width: 1200, height: 1000 } })).newPage();
  console.log("\n=== 5. Fluxul OP ===");
  await p.goto(B + "/comanda/transfer?pachet=promo-50", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(900);
  const t = await p.locator("body").innerText();
  check(t.includes("RO15BTRLRONCRT0652757201"), "IBAN afisat");
  check(t.includes("LEGIO WEB DEVELOPMENT TOOLS"), "beneficiar afisat");
  check(t.includes("500 lei"), "suma pachetului");
  check((await p.locator('input[required]').count()) >= 6, "campuri de facturare obligatorii");
  check(t.includes("Încarcă dovada plății"), "incarcare dovada");
  // pachet cazino -> suma dubla
  await p.goto(B + "/comanda/transfer?pachet=promo-50-cazino", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(700);
  check((await p.locator("body").innerText()).includes("1.000 lei"), "cazino prin OP: 1.000 lei");
  await p.close();
}

// ---------- RETEAUA: sa se poata si COMANDA, nu doar cere lista ----------
{
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  console.log("\n=== 5b. /reteaua-noastra duce spre comanda ===");
  await p.goto(B + "/reteaua-noastra", { waitUntil: "networkidle" });

  // Pagina a avut o perioada UN SINGUR buton pe tot cuprinsul ei —
  // "Primeste lista pe email". Cine ajungea convins la finalul listei nu avea
  // ce sa faca decat sa-si lase adresa, si nu se vindea nimic. Blocul de
  // comanda de sub lista e reparatia; testul asta il pazeste.
  const cta = p.locator('a[href="/oferta-500"]');
  check((await cta.count()) > 0, "exista indemn la comanda");
  check(await p.locator("text=Le-ai văzut").isVisible(), "blocul de comanda apare sub lista");

  const yCta = (await p.locator("text=Le-ai văzut").boundingBox()).y;
  const yMail = (await p.locator("text=Trimite-mi lista pe email").boundingBox()).y;
  check(yCta < yMail, "comanda vine inaintea formularului de email");

  // Lista trebuie sa ramana publica — a fost ascunsa dupa formular candva.
  const externe = await p.locator('a[href^="https://"]').count();
  check(externe >= 45, `lista ramane publica (${externe} linkuri catre ziare)`);

  // Formularul nu se sterge, doar se retrogradeaza: e util cui nu e decis.
  check(await p.locator("text=Trimite-mi lista pe email").isVisible(), "formularul ramane disponibil");
  await p.close();
}

// ---------- MOBIL ----------
{
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  console.log("\n=== 6. Mobil 390px ===");
  await p.goto(B + "/oferta-500", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1400);
  // Bara fixa, NU butonul din corpul paginii: ambele duc la #oferta, deci
  // selectorul trebuie ancorat pe containerul fix, altfel prinde doua elemente.
  const bar = await p.locator('div.fixed.bottom-0 a[href="#oferta"]').boundingBox();
  const wa = await p.locator('a[aria-label*="WhatsApp"]').boundingBox();
  const chat = await p.getByRole("button", { name: /Ai o întrebare/ }).boundingBox();
  check(!!bar, "bara fixa 'Comanda acum' apare");
  check(!!wa && !!bar && wa.y + wa.height <= bar.y + 2, "WhatsApp nu acopera bara de comanda");
  check(!!chat && !!bar && chat.y + chat.height <= bar.y + 2, "consultantul nu acopera bara de comanda");
  check(!!wa && !!chat && (chat.x + chat.width) <= wa.x, "consultantul si WhatsApp nu se suprapun");

  // Regresie: butonul flotant de WhatsApp e tot z-40 si sta fix in dreapta-jos,
  // exact peste butonul de trimitere al chatului deschis. Cand chatul era si el
  // z-40, WhatsApp fura atingerea si omul nu putea trimite nimic din chat.
  await p.getByRole("button", { name: /Ai o întrebare/ }).click();
  const panel = p.locator('[data-chat="panel"]');
  await panel.waitFor();
  const trimite = panel.locator("button[aria-label=Trimite]");
  const acoperit = await trimite.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const sus = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !el.contains(sus) && sus !== el;
  });
  check(!acoperit, "butonul de trimitere din chat nu e acoperit de WhatsApp");
  // fara scroll orizontal
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  check(sw <= 391, `fara scroll orizontal (${sw}px)`);
  await p.screenshot({ path: S + "/final-mobil.png" });
  await p.goto(B + "/comanda/transfer?pachet=promo-50", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(800);
  const sw2 = await p.evaluate(() => document.documentElement.scrollWidth);
  check(sw2 <= 391, `flux OP pe mobil, fara scroll orizontal (${sw2}px)`);
  await p.close();
}

// ---------- SEO ----------
{
  const p = await (await b.newContext()).newPage();
  console.log("\n=== 7. SEO ===");
  const r = await p.goto(B + "/sitemap.xml");
  const xml = await r.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check(urls.length >= 88, `sitemap: ${urls.length} URL-uri`);
  check(urls.some((u) => u.includes("/oferta-500")), "/oferta-500 in sitemap");
  check(urls.some((u) => u.includes("/reteaua-noastra")), "/reteaua-noastra in sitemap");
  const html = await (await p.goto(B + "/reteaua-noastra")).text();
  check(!/noindex/.test(html), "reteaua-noastra e indexabila");
  await p.close();
}

console.log("\n" + "=".repeat(60));
console.log(fails.length === 0 ? "TOATE VERIFICARILE AU TRECUT" : `ESUATE (${fails.length}):\n` + fails.map((f) => " x " + f).join("\n"));
await b.close();
