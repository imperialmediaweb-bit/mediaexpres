import { chromium } from "playwright-core";

/**
 * Comanda facuta integral din chat, pe toate ramurile ei.
 *
 * De ce e suita separata: chatul e singurul loc unde un om poate plati fara sa
 * atinga vreun formular clasic. Daca un pas se strica, nu apare nicio eroare pe
 * site — omul pur si simplu nu poate comanda, si nu afli decat din vanzari.
 *
 * Cloudinary nu e configurat local, deci INCARCAREA fisierului e simulata.
 * Restul e real: POST-ul final chiar ajunge la /api/comanda/transfer si chiar
 * scrie in baza de date, exact ca o comanda de la un client.
 */

const B = "http://localhost:3000";
const fails = [];
function check(ok, msg, extra = "") {
  console.log(`${ok ? "  OK  " : " FAIL "} ${msg}${extra ? ` — ${extra}` : ""}`);
  if (!ok) fails.push(msg);
}

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function openChat() {
  const p = await b.newPage({ viewport: { width: 420, height: 900 } });
  await p.route("**/api/comanda/transfer/upload-sign", (r) =>
    r.fulfill({
      json: { ok: true, cloudName: "demo", apiKey: "k", timestamp: 1, folder: "f", signature: "s" },
    }),
  );
  await p.route("**/api.cloudinary.com/**", (r) =>
    r.fulfill({ json: { secure_url: "https://res.cloudinary.com/demo/image/upload/d.png" } }),
  );
  await p.goto(B + "/oferta-500");
  await p.locator("text=Ai o întrebare?").click();
  const c = p.locator('[data-chat="panel"]');
  await c.waitFor();
  return {
    p,
    c,
    btn: (t) => c.locator("button", { hasText: t }).first(),
    seen: (t) => c.locator(`text=${t}`).first().isVisible(),
    send: () => c.locator("button[aria-label=Trimite]").click(),
    wait: (ms = 400) => p.waitForTimeout(ms),
    type: async (v) => {
      await c.locator("input[type=text]").fill(v);
      await c.locator("button[aria-label=Trimite]").click();
      await p.waitForTimeout(400);
    },
    proof: async () => {
      await c
        .locator("input[type=file]")
        .setInputFiles({ name: "dovada.png", mimeType: "image/png", buffer: Buffer.from("x") });
      await p.waitForTimeout(1000);
    },
  };
}

// ---------- 1. Transfer bancar, cu articol gata scris ----------
console.log("\n=== 1. Comanda prin OP, cu articol ===");
{
  const { p, c, btn, seen, send, wait, type, proof } = await openChat();
  let sent = null, status = null;
  p.on("request", (r) => {
    if (r.url().endsWith("/api/comanda/transfer") && r.method() === "POST")
      sent = JSON.parse(r.postData() || "{}");
  });
  p.on("response", (r) => {
    if (r.url().endsWith("/api/comanda/transfer") && r.request().method() === "POST")
      status = r.status();
  });

  check(await btn("Comandă acum").isVisible(), "chatul ofera buton de comanda");
  check(
    await c.locator("a", { hasText: "lista celor 50 de ziare" }).isVisible(),
    "chatul ofera lista de ziare inainte de comanda",
  );

  await btn("Comandă acum").click(); await wait();
  check(await seen("cazinouri, pariuri"), "intreaba de cazino inainte de pret");
  await btn("Nu, e alt domeniu").click(); await wait();
  check(await seen("costă 500 lei"), "pretul standard e 500 lei");
  await btn("Prin transfer bancar").click(); await wait();

  await c.locator("input[type=email]").fill("gresit"); await send(); await wait(300);
  check(await seen("Adresa nu pare validă"), "respinge emailul invalid, in romana");
  await c.locator("input[type=email]").fill("client@firma-test.ro"); await send(); await wait();

  await c.locator("input[type=tel]").fill("123"); await send(); await wait(300);
  check(await seen("telefon românesc valid"), "respinge telefonul invalid");
  await c.locator("input[type=tel]").fill("0758169388"); await send(); await wait();

  await type("Firma Test SRL");
  await type("RO12345678");
  await type("Str. Exemplu nr. 1, București");
  check(await seen("Ai articolul scris"), "cere datele de facturare inainte de articol");

  await btn("Am articolul scris").click(); await wait();
  await type("Titlu de test pentru articol");
  await c.locator("textarea").fill("prea scurt"); await send(); await wait(300);
  check(await seen("Mai scurt de 100"), "respinge articolul sub minimul serverului");
  await c.locator("textarea").fill("A".repeat(150)); await send(); await wait();
  await type("https://firma-test.ro");

  check(await btn("Fără poze").isVisible(), "pozele pot fi sarite");
  await btn("Fără poze").click(); await wait();

  // Declaratia de continut se cere INAINTE de datele de plata. Ordinea nu e
  // cosmetica: dupa ce omul a virat banii, un "nu" aici ar insemna restituire
  // prin banca — exact ce s-a intamplat o data si nu se mai repeta.
  check(await seen("tratamente sau metode de vindecare"), "cere declaratia de continut");
  check(!(await seen("RO15BTRLRONCRT0652757201")), "nu da date de plata inainte de declaratie");
  await btn("Da, confirm").click(); await wait();

  check(await seen("RO15BTRLRONCRT0652757201"), "arata IBAN-ul in conversatie");
  check(await seen("Suma: 500 lei"), "arata suma de plata");

  // Drumul implicit de-acum: comanda pleaca FARA dovada platii — clientul
  // primeste factura pe email si plateste pe baza ei. Cerinta veche il obliga
  // sa fi platit inainte sa aiba vreun document, si nu trimitea nimeni.
  check(await seen("Nu trebuie să plătești acum"), "chatul spune ca plata vine dupa factura");
  check(await btn("Trimit comanda, plătesc după factură").isVisible(), "exista drumul fara dovada");
  await btn("Trimit comanda, plătesc după factură").click(); await wait();
  check(await seen("după factura primită pe email"), "rezumatul arata plata dupa factura");

  await btn("Trimite comanda").click(); await wait(8000);
  check(status === 200, "serverul accepta comanda FARA dovada", `HTTP ${status}`);
  check(sent?.email === "client@firma-test.ro", "trimite emailul clientului");
  check(sent?.companyCui === "RO12345678", "trimite CUI-ul");
  check(sent?.companyAddress?.includes("Exemplu"), "trimite adresa de facturare");
  check(!("paymentProof" in (sent || {})), "nu trimite camp de dovada gol");
  check(await seen("Am primit comanda ta"), "confirma comanda in chat");
  await p.close();
}

// ---------- 2. Cazino: pretul se dubleaza ----------
console.log("\n=== 2. Articol de cazino ===");
{
  const { p, c, btn, seen, send, wait, type, proof } = await openChat();
  let sent = null;
  p.on("request", (r) => {
    if (r.url().endsWith("/api/comanda/transfer") && r.method() === "POST")
      sent = JSON.parse(r.postData() || "{}");
  });
  await btn("Comandă acum").click(); await wait();
  await btn("Da, cazino").click(); await wait();
  check(await seen("costă 1000 lei"), "pretul de cazino e 1000 lei");
  await btn("Prin transfer bancar").click(); await wait();
  await c.locator("input[type=email]").fill("cazino@test.ro"); await send(); await wait();
  await c.locator("input[type=tel]").fill("0758169388"); await send(); await wait();
  await type("Cazino Test SRL");
  await type("RO999");
  await type("Str. Test 5, Cluj");
  await btn("Am articolul scris").click(); await wait();
  await type("Articol cazino de test");
  await c.locator("textarea").fill("B".repeat(500)); await send(); await wait();
  await type("https://cazino-test.ro");
  await btn("Fără poze").click(); await wait();
  await btn("Da, confirm").click(); await wait();
  check(await seen("Suma: 1000 lei"), "suma bancara e tot 1000 lei");
  await proof();
  await btn("Trimite comanda").click(); await wait(8000);
  check(sent?.packageId === "promo-50-cazino", "pleaca pachetul de cazino", sent?.packageId);
  check(sent?.isCasino === true, "steagul de cazino ajunge la server");
  await p.close();
}

// ---------- 3. Card: scurtatura spre Stripe ----------
console.log("\n=== 3. Plata cu cardul ===");
{
  const { p, c, btn, send, wait } = await openChat();
  let body = null, laStripe = false;
  await p.route("**/api/checkout", async (r) => {
    body = JSON.parse(r.request().postData() || "{}");
    await r.fulfill({ json: { ok: true, url: "https://checkout.stripe.com/c/pay/test" } });
  });
  // Stripe nu e accesibil din mediul de test — servim o pagina falsa la aceeasi
  // adresa, ca sa putem confirma ca browserul chiar pleaca intr-acolo.
  await p.route("**checkout.stripe.com/**", (r) => {
    laStripe = true;
    return r.fulfill({ contentType: "text/html", body: "<h1>Stripe</h1>" });
  });
  await btn("Comandă acum").click(); await wait();
  await btn("Nu, e alt domeniu").click(); await wait();
  await btn("Cu cardul").click(); await wait();
  check(await c.locator("input[type=email]").isVisible(), "la card cere doar emailul");
  await c.locator("input[type=email]").fill("card@test.ro"); await send(); await wait(4000);
  check(!!body, "cheama /api/checkout");
  check(body?.packageId === "promo-50", "cu pachetul corect", body?.packageId);
  check(body?.email === "card@test.ro", "cu emailul clientului");
  check(laStripe, "browserul pleaca spre Stripe");
  await p.close();
}

// ---------- 4. Fara articol: tema marcata pentru admin ----------
console.log("\n=== 4. Clientul nu are articol ===");
{
  const { p, c, btn, seen, send, wait, type, proof } = await openChat();
  let sent = null;
  p.on("request", (r) => {
    if (r.url().endsWith("/api/comanda/transfer") && r.method() === "POST")
      sent = JSON.parse(r.postData() || "{}");
  });
  await btn("Comandă acum").click(); await wait();
  await btn("Nu, e alt domeniu").click(); await wait();
  await btn("Prin transfer bancar").click(); await wait();
  await c.locator("input[type=email]").fill("fara@test.ro"); await send(); await wait();
  await c.locator("input[type=tel]").fill("0758169388"); await send(); await wait();
  await type("Fara Articol SRL");
  await type("RO555");
  await type("Str. Noua 9, Iasi");
  await btn("Scrieți-l voi").click(); await wait();
  check(await seen("Spune-mi despre ce să scriem"), "sare titlul si cere tema");
  await c
    .locator("textarea")
    .fill("Firma noastra vinde echipamente medicale pentru cabinete stomatologice.");
  await send(); await wait();
  await type("https://fara-test.ro");
  await btn("Fără poze").click(); await wait();
  await btn("Da, confirm").click(); await wait();
  check(await seen("îl redactăm noi"), "rezumatul spune ca redactam noi");
  await proof();
  await btn("Trimite comanda").click(); await wait(8000);
  // Marcajul e obligatoriu: fara el, tema ajunge publicata ca articol.
  check(
    sent?.body?.startsWith("[DE REDACTAT DE NOI"),
    "corpul e marcat clar pentru admin",
    sent?.body?.slice(0, 30),
  );
  check(sent?.title?.startsWith("[De redactat]"), "si titlul semnaleaza", sent?.title);
  await p.close();
}

await b.close();
console.log("\n" + "=".repeat(60));
if (fails.length) {
  console.log(`ESUATE (${fails.length}):`);
  fails.forEach((f) => console.log(" x " + f));
  process.exit(1);
}
console.log("TOATE VERIFICARILE AU TRECUT");
