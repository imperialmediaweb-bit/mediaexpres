// De unde a venit clientul — cookie-ul me_src si propozitia din WhatsApp.
//
//   node tests/sursa.mjs            # cere serverul pe :3000
import { chromium } from "playwright-core";

const B = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
let n = 0;
const fails = [];
function t(name, ok, extra = "") {
  n++;
  if (!ok) fails.push(`${n}. ${name}${extra ? " — " + extra : ""}`);
  console.log(`${ok ? " OK " : "FAIL"} ${String(n).padStart(2)}. ${name}${extra ? " — " + extra : ""}`);
}
const cookie = async (ctx) => decodeURIComponent((await ctx.cookies()).find((c) => c.name === "me_src")?.value || "");
const waText = async (page, sel) => {
  const href = await page.locator(sel).first().getAttribute("href");
  return decodeURIComponent((href || "").split("text=")[1] || "");
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

// 1. Click din Google Ads pe oferta.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${B}/oferta-500?gclid=TEST123&utm_campaign=advertoriale`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.cookie.includes("me_src="), null, { timeout: 8000 }).catch(() => {});
  t("gclid: cookie-ul spune Google Ads + campania", (await cookie(ctx)) === "google|cpc|advertoriale", `cookie: ${await cookie(ctx)}`);
  await page.waitForTimeout(400);
  const wa = await waText(page, 'a[href*="wa.me"][href*="Vreau"]');
  t("mesajul de comanda pe WhatsApp spune „Am văzut oferta pe Google.”", wa.includes("Am văzut oferta pe Google."), wa.slice(-60));
  const flotant = await waText(page, '[data-testid="wa-flotant"]');
  t("si butonul flotant spune la fel", flotant.includes("Am văzut oferta pe Google."), flotant.slice(-60));

  // 2. Revine a doua zi tastand adresa: sursa ramane Google Ads.
  await page.goto(`${B}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  t("intrare directa dupa reclama: ramane Google Ads", (await cookie(ctx)) === "google|cpc|advertoriale", `cookie: ${await cookie(ctx)}`);

  // 3. Apoi da click intr-o reclama de Facebook: cea mai noua reclama castiga.
  await page.goto(`${B}/oferta-500?fbclid=IwAR0abc`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.cookie.includes("facebook"), null, { timeout: 8000 }).catch(() => {});
  t("fbclid: cookie-ul trece pe Facebook Ads", (await cookie(ctx)) === "facebook|paid|", `cookie: ${await cookie(ctx)}`);
  await page.waitForTimeout(400);
  const wa2 = await waText(page, 'a[href*="wa.me"][href*="Vreau"]');
  t("mesajul de WhatsApp spune acum Facebook", wa2.includes("Am văzut oferta pe Facebook."), wa2.slice(-60));

  // 4. Cookie-ul ajunge la server: /api/checkout il citeste din cerere.
  const res = await page.request.post(`${B}/api/checkout`, {
    data: { packageId: "promo-50", mode: "payment", email: "test-sursa@example.com" },
  });
  t("checkout-ul primeste cererea cu cookie-ul (raspunde, nu cade)", res.status() < 500, `HTTP ${res.status()}`);
  await ctx.close();
}

// 5. Vizitator fara nimic: direct.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const erori = [];
  page.on("console", (m) => m.type() === "error" && erori.push(m.text()));
  page.on("pageerror", (e) => erori.push(String(e)));
  await page.goto(`${B}/oferta-500`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.cookie.includes("me_src="), null, { timeout: 8000 }).catch(() => {});
  t("fara reclama si fara referrer: direct", (await cookie(ctx)) === "direct|none|", `cookie: ${await cookie(ctx)}`);
  await page.waitForTimeout(300);
  const wa = await waText(page, 'a[href*="wa.me"][href*="Vreau"]');
  t("mesajul de WhatsApp nu primeste nicio propozitie in plus", !wa.includes("Am văzut"), wa.slice(-60));
  const hidr = erori.filter((e) => /hydrat|did not match/i.test(e));
  t("pagina nu are erori de hidratare (propozitia se pune abia dupa montare)", hidr.length === 0, hidr[0]?.slice(0, 120) || "");
  await ctx.close();
}

// 6. Vine din cautare Google (referrer), fara click platit.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${B}/oferta-500`, { waitUntil: "networkidle", referer: "https://www.google.com/" });
  await page.waitForFunction(() => document.cookie.includes("me_src="), null, { timeout: 8000 }).catch(() => {});
  t("referrer Google: cautare organica", (await cookie(ctx)) === "google|organic|", `cookie: ${await cookie(ctx)}`);
  await ctx.close();
}

await browser.close();
console.log("\n" + "=".repeat(60));
console.log(`${n - fails.length}/${n} OK`);
if (fails.length) console.log(fails.map((f) => "  x " + f).join("\n"));
process.exit(fails.length ? 1 : 0);
