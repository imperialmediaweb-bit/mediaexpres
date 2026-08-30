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

  // Caseta de cazino e colapsata intr-un <details> — intentionat: ~95% dintre
  // vizitatori n-au legatura cu jocurile de noroc, iar desfasurata impingea
  // butonul de comanda sub marginea ecranului pe telefon. Testul o deschide
  // intai, exact ca un client din nisa.
  await p.locator("summary", { hasText: "cazino" }).first().click();
  await p.waitForTimeout(300);
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
  // GA raporta doar page_view ("Evenimente importante: 0"); begin_checkout e
  // oglinda evenimentului de pixel, ca funnelul sa fie vizibil si in Analytics.
  // Citim dataLayer-ul REAL: un interceptor pe window.gtag ar fi suprascris de
  // declaratia globala `function gtag()` din scriptul inline al tagului.
  const bc = await p.evaluate(() =>
    (window.dataLayer || [])
      .map((e) => Array.from(e))
      .filter((e) => e[0] === "event" && e[1] === "begin_checkout"),
  );
  check(bc.length === 1 && bc[0][2]?.value === 500, "GA begin_checkout cu valoarea 500");
  await p.locator('input[type="email"]').first().fill("gresit");
  await p.getByRole("button", { name: /Card — plătesc acum/ }).first().click();
  await p.waitForTimeout(400);
  check(sent === null, "email invalid: blocat local, fara cerere la server");
  await p.locator('input[type="email"]').first().fill("test@firma.ro");
  await p.getByRole("button", { name: /Card — plătesc acum/ }).first().click();
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

// ---------- POPUP-UL DE IESIRE VINDE, NU DEVIAZA ----------
{
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  console.log("\n=== 4a. Exit-intent pe pagina de vanzare ===");
  await p.goto(B + "/oferta-500", { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  // declansam iesirea: mouseleave NU bubbleaza, deci trebuie emis chiar pe
  // document, unde asculta componenta — exact ce face browserul cand mouse-ul
  // paraseste viewportul pe sus
  await p.evaluate(() => {
    document.dispatchEvent(new MouseEvent("mouseleave", { clientY: 0 }));
  });
  await p.waitForTimeout(600);
  const dialog = p.locator('[role="dialog"]');
  check(await dialog.isVisible(), "popupul apare la intentia de iesire");
  const txt = (await dialog.innerText()).replace(/\s+/g, " ");
  // Varianta veche oferea aici formularul de lista — il scotea pe om din
  // drumul de cumparare exact in momentul deciziei. Acum vinde.
  check(/banii înapoi/i.test(txt), "conduce cu garantia");
  check(await dialog.locator('a[href="/oferta-500#oferta"]').isVisible(), "butonul principal e comanda");
  check(await dialog.locator('a[href*="wa.me"]').isVisible(), "WhatsApp pentru intrebari");
  check(!(await dialog.locator("input[type=email]").isVisible()), "emailul NU e primul plan");
  await dialog.locator("button", { hasText: "pe email" }).click();
  // primul <input> e honeypot-ul anti-spam, ascuns intentionat — cautam unul vizibil
  const vizibil = dialog.locator("input:visible").first();
  await vizibil.waitFor({ timeout: 5000 });
  check(await vizibil.isVisible(), "formularul de email ramane la un click");
  await p.close();
}

// ---------- PUNTEA TELEFON -> BIROU ----------
{
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  console.log("\n=== 4c. Emailul de continuare la alegerea OP ===");
  let continua = null;
  await p.route("**/api/oferta/continua", async (r) => {
    continua = JSON.parse(r.request().postData() || "{}");
    await r.fulfill({ json: { ok: true } });
  });
  await p.goto(B + "/oferta-500", { waitUntil: "networkidle" });
  await p.locator("#oferta button", { hasText: "Comandă acum" }).first().click();
  await p.waitForTimeout(400);
  await p.locator("#oferta input[type=email]").fill("punte@firma.ro");
  await p.waitForTimeout(200);
  // click pe OP fara sa navigam efectiv (route-ul de mai sus nu opreste nav,
  // dar cererea keepalive pleaca inainte)
  await p.locator('#oferta a[href*="/comanda/transfer"]').first().click();
  await p.waitForTimeout(1500);
  check(continua?.email === "punte@firma.ro" && continua?.packageId === "promo-50",
    "clickul pe OP trimite emailul de continuare (linkul inapoi in inbox)");
  await p.close();
}

// ---------- ATASAMENTE LA TRIMITE EMAIL ----------
{
  const a = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  console.log("\n=== 4d. Factura se poate atasa din admin ===");
  // Proprietarul a vrut sa trimita factura PDF de pe domeniul lui si n-a
  // avut cum: ruta stia de atasamente, formularul nu avea butonul.
  const { readFileSync } = await import("node:fs");
  const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
  await a.goto(B + "/admin/login");
  await a.fill('input[name="username"]', env.ADMIN_USER);
  await a.fill('input[name="password"]', env.ADMIN_PASSWORD);
  await a.click('button[type="submit"]');
  await a.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 });
  await a.goto(B + "/admin/trimite-email", { waitUntil: "networkidle" });

  check(await a.locator("text=Atașează un fișier").isVisible(), "campul de atasare exista");
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(100 * 1024, 0x20)]);
  await a.locator('input[type="file"]').setInputFiles({ name: "factura-test.pdf", mimeType: "application/pdf", buffer: pdf });
  await a.waitForTimeout(700);
  check(await a.locator("li", { hasText: "factura-test.pdf" }).isVisible(), "fisierul apare in lista");

  let sent = null;
  await a.route("**/api/admin/send-email", async (r) => {
    sent = JSON.parse(r.request().postData() || "{}");
    await r.fulfill({ json: { ok: true, sent: 1 } });
  });
  await a.fill("textarea >> nth=0", "client-atasament@test.ro");
  await a.fill('input[placeholder="Subiectul emailului"]', "Factura fiscala");
  await a.fill("textarea >> nth=1", "Buna ziua,\n\nAveti atasata factura.\n\nMultumim!");
  await a.locator("button", { hasText: "Trimite acum" }).click();
  await a.waitForTimeout(1200);
  check(sent?.attachments?.length === 1 && sent.attachments[0].filename === "factura-test.pdf",
    "atasamentul pleaca in payload");
  check(Buffer.from(sent?.attachments?.[0]?.content || "", "base64").subarray(0, 5).toString() === "%PDF-",
    "base64-ul se decodeaza inapoi in PDF");

  // fisier peste limita: refuzat cu mesaj, si NU intra in LISTA (cautam <li>,
  // nu textul brut — mesajul de eroare contine si el numele fisierului)
  const mare = Buffer.alloc(6 * 1024 * 1024, 0x41);
  await a.locator('input[type="file"]').setInputFiles({ name: "prea-mare.pdf", mimeType: "application/pdf", buffer: mare });
  await a.waitForTimeout(700);
  check(await a.locator("text=depășește 5MB").isVisible(), "6MB refuzat cu mesaj in romana");
  check((await a.locator("li", { hasText: "prea-mare.pdf" }).count()) === 0, "si nu intra in lista");
  await a.close();
}

// ---------- GA NU MASOARA ADMINUL ----------
{
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  console.log("\n=== 4b. GA tace pe /admin ===");
  // 422 de afisari "Admin" intr-o saptamana erau vizitele proprietarului —
  // ingropau rata de conversie reala sub zgomot intern.
  const gaRequests = [];
  p.on("request", (r) => {
    if (r.url().includes("googletagmanager.com")) gaRequests.push(r.url());
  });
  await p.goto(B + "/admin/login", { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  check(gaRequests.length === 0, `scriptul GA nu se incarca pe /admin (${gaRequests.length} cereri)`);
  await p.goto(B + "/oferta-500", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  check(gaRequests.length > 0, "dar pe paginile publice se incarca");
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
  // Dovada platii e OPTIONALA prin design: cerinta veche il obliga pe client
  // sa fi platit inainte sa fi primit vreo factura — cerc vicios care a tinut
  // conversia OP la zero. Verificam si textul, si serverul.
  check(t.includes("Nu trebuie să fi plătit"), "spune ca se comanda fara plata facuta");
  check(/opțional/i.test(t), "dovada e marcata optional");

  // Emailul scris pe pagina de oferta ajunge precompletat aici — omul nu-l
  // scrie de doua ori. Il verificam direct prin parametrul de query.
  await p.goto(B + "/comanda/transfer?pachet=promo-50&email=precompletat%40firma.ro", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(700);
  check(
    (await p.locator('input[type="email"]').first().inputValue()) === "precompletat@firma.ro",
    "emailul din oferta vine precompletat in formular",
  );
  await p.goto(B + "/comanda/transfer?pachet=promo-50", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(700);

  const MARK = `flows-op-${Date.now()}@test.ro`;
  let opStatus = null;
  p.on("response", (r) => {
    if (r.url().includes("/api/comanda/transfer") && r.request().method() === "POST")
      opStatus = r.status();
  });
  await p.fill('input[type="email"]', MARK);
  await p.fill('input[type="tel"]', "0758169388");
  await p.fill('input[placeholder="Firma Mea SRL"]', "Flows OP SRL");
  await p.fill('input[placeholder="RO12345678"]', "RO4242");
  await p.fill('input[placeholder="Str., nr., oraș, județ"]', "Str. Flows 1, Cluj");
  // titlul n-are placeholder: il gasim prin h2-ul unic al sectiunii lui
  await p.locator('h2:has-text("3. Articolul")').locator("..").locator("input").first()
    .fill("Titlu de test din suita flows");
  await p.locator("textarea").first().fill("F".repeat(150));
  await p.locator("button", { hasText: "Trimite comanda" }).click();
  await p.waitForTimeout(6000);
  check(opStatus === 200, `comanda pleaca FARA dovada platii (HTTP ${opStatus})`);

  // pachet cazino -> suma dubla
  await p.goto(B + "/comanda/transfer?pachet=promo-50-cazino", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(700);
  check((await p.locator("body").innerText()).includes("1.000 lei"), "cazino prin OP: 1.000 lei");
  await p.close();

  // ---------- 5d. Adminul nu poate publica o comanda OP neincasata ----------
  {
    const a = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    console.log("\n=== 5d. Gardul de plata din admin ===");
    const { readFileSync } = await import("node:fs");
    const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
    await a.goto(B + "/admin/login");
    await a.fill('input[name="username"]', env.ADMIN_USER);
    await a.fill('input[name="password"]', env.ADMIN_PASSWORD);
    await a.click('button[type="submit"]');
    await a.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20000 });

    // deschidem exact comanda creata mai sus, dupa emailul ei unic
    await a.goto(B + "/admin/materiale", { waitUntil: "networkidle" });
    const card = a.locator("div.rounded-xl", { hasText: MARK }).first();
    check(await card.isVisible(), "comanda din test apare in lista");
    check((await card.locator("button", { hasText: "Marchează publicat" }).count()) === 0,
      "lista NU ofera publicarea pe OP neincasat");
    await card.locator("a", { hasText: "Deschide" }).click();
    await a.waitForLoadState("networkidle");

    check(await a.locator("text=NEÎNCASATĂ").first().isVisible(), "badge NEINCASATA in detaliu");
    // butonul e componenta de client: asteptam hidratarea, nu doar networkidle
    const confirmBtn = a.locator("button", { hasText: "Confirmă plata" });
    await confirmBtn.waitFor({ timeout: 15000 });
    check(await confirmBtn.isVisible(), "exista Confirma plata");
    check(await a.locator("button", { hasText: "Marchează publicat" }).isDisabled(),
      "Marcheaza publicat e blocat");

    // gardul de pe SERVER, nu doar din UI: publish direct pe API -> 409
    const orderId = a.url().split("/").pop();
    const api = await a.evaluate(async (id) => {
      const r = await fetch(`/api/admin/materiale/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      return r.status;
    }, orderId);
    check(api === 409, `serverul refuza publicarea neincasata (HTTP ${api})`);

    // confirmarea deblocheaza publicarea
    await a.locator("button", { hasText: "Confirmă plata" }).click();
    await a.waitForTimeout(2000);
    check(await a.locator("text=ÎNCASATĂ").first().isVisible(), "starea devine INCASATA");
    check(!(await a.locator("button", { hasText: "Marchează publicat" }).isDisabled()),
      "publicarea s-a deblocat");
    await a.close();
  }
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

// ---------- BARA CU TERMENUL OFERTEI ----------
{
  console.log("\n=== 5c. Termenul din bara de sus e real ===");
  // Bara calcula termenul ca "3 zile de la prima vizita a acestui browser" si
  // il tinea in localStorage. Fiecare om vedea mereu 3 zile, incognito il
  // resetа, si contrazicea "pana pe 14 septembrie" de pe /oferta-500. Acum
  // numara catre termenul real din PROMO_ROLLING, acelasi pentru toata lumea.
  const citeste = async (p) => {
    for (let i = 0; i < 30; i++) {
      if (await p.locator("div.bg-brand-red").count()) {
        const s = (await p.locator("div.bg-brand-red").first().innerText()).replace(/\s+/g, " ").trim();
        if (/\d+z/.test(s)) return s;
      }
      await p.waitForTimeout(500);
    }
    return null;
  };
  const zile = (s) => (s && s.match(/(\d+)z/) ? parseInt(s.match(/(\d+)z/)[1], 10) : null);

  const texte = [];
  for (const u of ["/oferta", "/pachete"]) {
    // Context nou = vizitator nou, fara nimic in localStorage.
    const p = await (await b.newContext()).newPage();
    await p.goto(B + u, { waitUntil: "networkidle" });
    texte.push({ u, s: await citeste(p), p });
  }

  check(texte.every((x) => zile(x.s) !== null), "bara apare pe /oferta si /pachete");
  check(new Set(texte.map((x) => zile(x.s))).size === 1,
    `acelasi termen pentru vizitatori diferiti (${texte.map((x) => zile(x.s)).join(" / ")} zile)`);
  check(zile(texte[0].s) !== 3, `nu mai e cronometrul fals de 3 zile (${zile(texte[0].s)} zile)`);
  check(/septembrie|octombrie|noiembrie|decembrie/i.test(texte[0].s || ""),
    "arata data reala a ofertei, nu doar un numarator");
  check(await texte[0].p.locator('div.bg-brand-red a[href="/oferta-500"]').count() > 0,
    "bara duce spre comanda");

  // Reincarcarea nu trebuie sa porneasca numaratoarea de la capat.
  const inainte = zile(texte[0].s);
  await texte[0].p.reload({ waitUntil: "networkidle" });
  check(zile(await citeste(texte[0].p)) === inainte, "reincarcarea nu reseteaza termenul");

  for (const x of texte) await x.p.close();
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

  // Clasa intreaga de bug-uri, nu doar o instanta: /reteaua-noastra a stat
  // luni de zile SI in sitemap, SI pe disallow in robots.txt — Google primea
  // o harta cu un drum pe care tot noi il interziceam, deci pagina nu se
  // putea indexa. Verificam ca nicio adresa din sitemap nu e blocata de
  // vreo regula disallow.
  const robots = await (await p.goto(B + "/robots.txt")).text();
  const disallows = [...robots.matchAll(/^Disallow:\s*(\S+)/gim)]
    .map((m) => m[1].replace(/\*$/, ""));
  const blocate = urls.filter((u) => {
    const path = new URL(u).pathname;
    return disallows.some((d) => path === d || path.startsWith(d.endsWith("/") ? d : d + "/") || path.startsWith(d));
  });
  check(blocate.length === 0,
    `niciun URL din sitemap nu e blocat de robots.txt${blocate.length ? ` (${blocate.slice(0, 3).join(", ")})` : ""}`);
  await p.close();
}

console.log("\n" + "=".repeat(60));
console.log(fails.length === 0 ? "TOATE VERIFICARILE AU TRECUT" : `ESUATE (${fails.length}):\n` + fails.map((f) => " x " + f).join("\n"));
await b.close();
