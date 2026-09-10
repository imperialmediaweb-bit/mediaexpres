// Emailul pleaca la clientul de pe pagina caruia ai apasat butonul.
//
// 10.09.2026 — un raport a ajuns la clientul GRESIT. /admin/trimite-email isi
// lua adresa din URL o singura data, la montare; a doua intrare, de la alta
// comanda, se facea prin navigare in aplicatie (fara reincarcare), pagina nu
// se remonta si campul pastra clientul precedent.
//
// Testul reface EXACT drumul ala: intra pentru clientul A, apoi navigheaza
// in aplicatie (router.push, nu page.goto — goto ar reincarca si ar ascunde
// bugul) catre clientul B, si cere ca in camp sa fie B. Apoi verifica si
// cazul invers: omul a scris o adresa cu mana, URL-ul nu s-a schimbat —
// ce a scris ramane.
//
//   node tests/destinatar.mjs            # cere serverul pe :3000 si ADMIN_* in .env.local
import { chromium } from "playwright-core";
import fs from "node:fs";

const B = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

// Credentialele de admin din .env.local (valori locale de test).
const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
if (!env.ADMIN_USER || !env.ADMIN_PASSWORD) {
  console.error("Lipsesc ADMIN_USER / ADMIN_PASSWORD din .env.local");
  process.exit(2);
}

let n = 0;
const fails = [];
function t(name, ok, extra = "") {
  n++;
  if (!ok) fails.push(`${n}. ${name}${extra ? " — " + extra : ""}`);
  console.log(`${ok ? " OK " : "FAIL"} ${String(n).padStart(2)}. ${name}${extra ? " — " + extra : ""}`);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// Login prin API, ca in aplicatie.
const login = await page.request.post(`${B}/api/admin-login`, {
  data: { username: env.ADMIN_USER, password: env.ADMIN_PASSWORD },
});
t("login admin", login.ok(), `HTTP ${login.status()}`);

const A = "clientul-a@firma-a.ro";
const Bmail = "clientul-b@firma-b.ro";
const C = "scris-de-mana@altundeva.ro";

// 1. Prima intrare: clientul A. Aici bugul NU aparea niciodata.
await page.goto(`${B}/admin/trimite-email?to=${encodeURIComponent(A)}&sablon=material`, {
  waitUntil: "networkidle",
});
const camp = page.getByTestId("destinatari");
t("prima intrare: campul are clientul A", (await camp.inputValue()).trim() === A);
t(
  "prima intrare: sablonul „Cere articolul” e preselectat",
  (await page.locator("input[type=text], input:not([type])").first().inputValue()).includes("articol"),
);

// 2. A doua intrare, prin NAVIGARE IN APLICATIE (nu reincarcare) — drumul
//    butonului „Cere articolul” de pe pagina altei comenzi. Aici era bugul.
await page.evaluate((url) => window.next.router.push(url), `/admin/trimite-email?to=${encodeURIComponent(Bmail)}&sablon=material`);
await page.waitForFunction((v) => document.querySelector('[data-testid="destinatari"]')?.value?.trim() === v, Bmail, { timeout: 8000 }).catch(() => {});
const dupa = (await camp.inputValue()).trim();
t("a doua intrare, fara reincarcare: campul are clientul B, nu A", dupa === Bmail, `in camp: „${dupa}”`);

// 3. Inca o navigare, spre un al treilea client — sa nu fi mers doar o data.
await page.evaluate((url) => window.next.router.push(url), `/admin/trimite-email?to=${encodeURIComponent(A)}`);
await page.waitForFunction((v) => document.querySelector('[data-testid="destinatari"]')?.value?.trim() === v, A, { timeout: 8000 }).catch(() => {});
t("a treia intrare: campul urmeaza din nou URL-ul", (await camp.inputValue()).trim() === A);

// 4. Cazul invers: omul scrie o adresa cu mana. URL-ul nu se schimba, deci
//    ce a scris trebuie sa ramana — altfel i-am sterge munca.
await camp.fill(C);
await page.evaluate(() => window.next.router.push("/admin/trimite-email?to=" + encodeURIComponent("clientul-a@firma-a.ro")));
await page.waitForTimeout(600);
t("adresa scrisa de mana ramane cand URL-ul nu se schimba", (await camp.inputValue()).trim() === C, `in camp: „${(await camp.inputValue()).trim()}”`);

// 5. Si cand URL-ul chiar se schimba, castiga URL-ul: ai apasat pe alt client.
await page.evaluate(() => window.next.router.push("/admin/trimite-email?to=" + encodeURIComponent("clientul-b@firma-b.ro")));
await page.waitForFunction((v) => document.querySelector('[data-testid="destinatari"]')?.value?.trim() === v, Bmail, { timeout: 8000 }).catch(() => {});
t("cand apesi pe alt client, adresa lui inlocuieste ce era scris", (await camp.inputValue()).trim() === Bmail);

await browser.close();
console.log("\n" + "=".repeat(60));
console.log(`${n - fails.length}/${n} OK`);
if (fails.length) console.log(fails.map((f) => "  x " + f).join("\n"));
process.exit(fails.length ? 1 : 0);
