// Fiecare buton de cumparare de pe site, apasat pe rand, pe telefon.
//
// 13.09.2026 — de ce exista fisierul asta. Un client a scris pe WhatsApp ca
// „nu functioneaza butonul de cumparare". Avea dreptate: din 2 septembrie,
// trei dintre cele cinci butoane rosii de pe /oferta-500 erau <a href="#oferta">.
// Apasai si pagina derula 11.000 de pixeli INAPOI SUS, lin. Nu se cumpara
// nimic. Unsprezece zile.
//
// Commitul care le-a stricat se numea „Fluxul de comandă, testat de 100 de ori".
// Testul lui, stress.mjs, chiar rula de 100 de ori — dar apasa butonul din
// formularul de pe /comanda, si mocuia /api/checkout. Butoanele rosii de pe
// landing nu erau atinse niciodata. Un test poate sa treaca de 100 de ori si
// sa lase magazinul inchis.
//
// Regula verificata aici, singura care conteaza pentru un buton de cumparare:
// DUPA APASARE TREBUIE SA SE INTAMPLE CEVA. Ori ajungi la plata, ori ajungi pe
// alta pagina, ori ti se deschide formularul de comanda, ori ti se spune in
// scris de ce nu. Daca ramai pe aceeasi pagina si singura schimbare e ca s-a
// derulat — butonul e mort, oricum ar arata.
//
// (Formularul in fereastra e in lista pentru ca prima varianta a testului a
// picat butoanele de pe prima pagina si de pe /pachete: alea chiar deschid
// „Comandă articol", fara sa schimbe adresa. Un test care striga la butoane
// sanatoase e ignorat dupa a doua oara, si atunci nu mai prinde nimic.)
//
// Doua feluri de rulare:
//   node tests/butoane-plata.mjs                        → local, mocheaza Stripe
//   node tests/butoane-plata.mjs https://mediaexpress.ro → adevarat, pana la Stripe
//
// A doua e cea care conteaza inainte de o reclama: deschide sesiuni reale de
// checkout (neplatite, expira singure) si dovedeste ca drumul intreg merge.

import { chromium } from "playwright-core";

const B = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const MOCK = B.startsWith("http://localhost") || process.argv.includes("--mock");

// Browserul din aplicatia Facebook, pe iPhone: de acolo vin oamenii din
// reclama, si tot acolo a dat peste butonul mort clientul care a reclamat.
const UA_FB = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 [FBAN/FBIOS;FBDV/iPhone14,3;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/ro_RO;FBOP/5]";
const TELEFON = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

// Paginile pe care se poate cumpara. Landingul din reclama e primul: acolo
// ajunge omul care a dat click pe Facebook.
const PAGINI = ["/oferta-500", "/oferta", "/pachete", "/"];

// Ce inseamna „buton de cumparare". Deliberat strict pe verbul care promite
// plata — „Vezi lista celor 50 de ziare" chiar are voie sa deruleze pagina.
const CUMPARARE = /comand[ăa] acum|aboneaz[ăa]-te|pl[ăa]tesc acum|cump[ăa]r/i;

const fails = [];
function check(ok, msg) {
  console.log(`${ok ? "  OK  " : " FAIL "} ${msg}`);
  if (!ok) fails.push(msg);
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  // Prin proxy-ul de agent, QUIC si handshake-ul nou pica cererile catre
  // Stripe fara niciun mesaj — arata exact ca un buton stricat.
  args: ["--disable-quic", "--ssl-version-max=tls1.2", "--disable-features=EncryptedClientHello,PostQuantumKyber"],
});

async function contextNou() {
  const ctx = await browser.newContext({ ...TELEFON, userAgent: UA_FB, locale: "ro-RO" });
  if (MOCK) {
    // Local nu exista cheie de Stripe. Mockul raspunde ca serverul adevarat,
    // deci butonul care CHIAR cheama plata trece, iar cel care doar deruleaza
    // pica — adica exact bugul din 2 septembrie, prins fara chei.
    await ctx.route("**/api/checkout", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, url: B + "/comanda/anulat?test=butoane" }) }),
    );
  }
  return ctx;
}

// Inventarul butoanelor de pe o pagina: text, pozitie si daca sunt vizibile.
async function inventar(cale) {
  const ctx = await contextNou();
  const p = await ctx.newPage();
  await p.goto(B + cale, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(3500);
  const lista = await p.locator("button, a").evaluateAll((els, sursa) =>
    els
      .map((e, i) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return {
          i,
          text: (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50),
          href: e.getAttribute("href"),
          y: Math.round(r.top + window.scrollY),
          vizibil: r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none",
        };
      })
      .filter((o) => o.vizibil && new RegExp(sursa, "i").test(o.text)),
    CUMPARARE.source,
  );
  await ctx.close();
  // WhatsApp deschide alta aplicatie, in alt tab — nu e drumul cu cardul.
  return lista.filter((o) => !/wa\.me/.test(o.href || "") && !/whatsapp/i.test(o.text));
}

// Apasa UN buton intr-un context curat si spune ce s-a intamplat.
async function apasa(cale, tinta) {
  const ctx = await contextNou();
  const p = await ctx.newPage();
  let apelCheckout = null;
  p.on("response", (r) => {
    if (r.url().includes("/api/checkout")) apelCheckout = r.status();
  });
  await p.goto(B + cale, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(3500);

  const el = p.locator("button, a").nth(tinta.i);
  const urlInainte = new URL(p.url());
  const dialoguriInainte = await p.locator('[role="dialog"]').count();
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(400);

  let clickOk = true;
  try {
    await el.click({ timeout: 10000 });
  } catch {
    clickOk = false;
  }
  // Stripe raspunde de obicei in 1-2 secunde; lasam loc si de o retea proasta.
  await p.waitForTimeout(9000);

  const urlDupa = new URL(p.url());
  const textPagina = await p.locator("body").innerText().catch(() => "");
  const eroareScrisa = /eroare|nu am putut|încearcă din nou/i.test(textPagina.slice(0, 4000));
  const dialog = p.locator('[role="dialog"]');
  const dialogNou =
    (await dialog.count()) > dialoguriInainte && (await dialog.last().isVisible().catch(() => false));
  const titluDialog = dialogNou
    ? (await dialog.last().innerText().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 40)
    : "";
  await ctx.close();

  if (!clickOk) return { verdict: "MORT", de_ce: "butonul n-a putut fi apasat deloc (acoperit sau in miscare)" };
  if (apelCheckout && apelCheckout >= 400) return { verdict: "EROARE", de_ce: `/api/checkout a raspuns ${apelCheckout}` };
  if (urlDupa.host !== urlInainte.host) return { verdict: "PLATA", de_ce: urlDupa.host };
  if (urlDupa.pathname !== urlInainte.pathname) return { verdict: "PAS", de_ce: urlDupa.pathname };
  if (dialogNou) return { verdict: "FORMULAR", de_ce: `s-a deschis „${titluDialog}"` };
  if (eroareScrisa) return { verdict: "MESAJ", de_ce: "a spus in scris de ce nu merge" };
  // Aceeasi pagina, acelasi drum, niciun mesaj. Asta e butonul mort: fie a
  // derulat aiurea (href="#ceva"), fie n-a facut absolut nimic.
  return {
    verdict: "MORT",
    de_ce: urlDupa.hash && urlDupa.hash !== urlInainte.hash
      ? `a derulat pagina la ${urlDupa.hash} in loc sa deschida plata`
      : "n-a facut nimic: aceeasi pagina, niciun mesaj",
  };
}

console.log(`\nButoane de cumparare — ${B}${MOCK ? "  (Stripe mocuit)" : "  (pana la Stripe, real)"}\n`);

for (const cale of PAGINI) {
  const tinte = await inventar(cale);
  console.log(`\n=== ${cale} — ${tinte.length} butoane de cumparare ===`);
  if (cale === "/oferta-500") {
    // Landingul platit are butoane pe toata lungimea paginii, intentionat.
    // Daca raman mai putine de 4, ori s-a sters unul, ori s-a transformat
    // inapoi in link si a cazut din inventar.
    check(tinte.length >= 4, `landingul are cel putin 4 butoane de comanda (are ${tinte.length})`);
  }
  for (const t of tinte) {
    const r = await apasa(cale, t);
    const bun = ["PLATA", "PAS", "FORMULAR", "MESAJ"].includes(r.verdict);
    check(bun, `${cale} · „${t.text}" (la ${t.y}px) → ${r.verdict}: ${r.de_ce}`);
    if (!MOCK && bun && r.verdict === "PLATA") {
      check(/checkout\.stripe\.com/.test(r.de_ce), `  ...si ajunge chiar la Stripe, nu altundeva`);
    }
  }
}

await browser.close();

console.log(`\n${fails.length ? `${fails.length} PICATE` : "Toate butoanele de cumparare duc undeva."}`);
for (const f of fails) console.log(` - ${f}`);
process.exit(fails.length ? 1 : 0);
