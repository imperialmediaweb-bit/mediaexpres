const B = "http://localhost:3000";
let n = 0;
const fails = [];
function t(name, ok, extra = "") {
  n++;
  if (!ok) fails.push(`${n}. ${name}${extra ? " — " + extra : ""}`);
  console.log(`${ok ? " OK " : "FAIL"} ${String(n).padStart(3)}. ${name}${extra ? " — " + extra : ""}`);
}
async function post(path, body, headers = {}) {
  const r = await fetch(B + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let j = null;
  try { j = await r.json(); } catch { /* raspuns non-JSON */ }
  return { status: r.status, body: j };
}
async function get(path) {
  const r = await fetch(B + path, { redirect: "manual" });
  return { status: r.status, ct: r.headers.get("content-type") || "" };
}

console.log("\n########## I. SECURITATE: ENDPOINTURI PROTEJATE ##########");
t("cont/mesaje refuza fara sesiune", (await post("/api/cont/mesaje", { body: "test mesaj lung" })).status === 401);
t("cont/upload-sign refuza fara sesiune", (await post("/api/cont/upload-sign")).status === 401);
t("descarcare raport refuza fara sesiune", (await get("/api/cont/raport/oarecare?format=pdf")).status === 401);
t("descarcare xlsx refuza fara sesiune", (await get("/api/cont/raport/oarecare?format=xlsx")).status === 401);
t("admin/mesaje refuza fara sesiune", (await post("/api/admin/mesaje", { email: "a@b.ro", body: "x" })).status === 401);
t("admin/send-email refuza fara sesiune", (await post("/api/admin/send-email", { recipients: ["a@b.ro"], subject: "x", body: "yyyyyyyyyy" })).status === 401);
t("admin/send-list refuza fara sesiune", (await post("/api/admin/send-list", { email: "a@b.ro" })).status === 401);
t("admin/materiale PATCH refuza fara sesiune", (await (await fetch(B + "/api/admin/materiale/x", { method: "PATCH" })).status) === 401);
t("cron promo-announce refuza fara cheie", (await post("/api/cron/promo-announce")).status === 401);
t("cron promo-announce refuza cheie gresita", (await post("/api/cron/promo-announce", undefined, { "x-api-key": "gresit" })).status === 401);
t("fix-db refuza fara cheie", (await post("/api/admin/fix-db")).status === 401);
t("paginile de admin cer autentificare", (await get("/admin/materiale")).status === 307);
t("paginile de cont cer autentificare", (await get("/cont/mesaje")).status === 307);

console.log("\n########## J. VALIDAREA DATELOR ##########");
t("checkout: fara pachet -> 400", (await post("/api/checkout", {})).status === 400);
t("checkout: email invalid -> 400", (await post("/api/checkout", { packageId: "promo-50", email: "gresit" })).status === 400);
t("checkout: pachet inexistent -> nu 200", (await post("/api/checkout", { packageId: "nu-exista" })).status !== 200);
t("request-list: fara consimtamant GDPR -> 400", (await post("/api/request-list", { name: "Ion Popescu", email: "a@b.ro" })).status === 400);
t("request-list: email invalid -> 400", (await post("/api/request-list", { name: "Ion Popescu", email: "gresit", gdprConsent: true })).status === 400);
t("request-list: nume prea scurt -> 400", (await post("/api/request-list", { name: "I", email: "a@b.ro", gdprConsent: true })).status === 400);
t("transfer OP: corp gol -> 400", (await post("/api/comanda/transfer", {})).status === 400);
// Regula s-a INTORS deliberat: dovada platii e optionala. Cerinta veche il
// obliga pe client sa fi platit inainte sa fi primit vreo factura — cerc
// vicios care a tinut conversia OP la zero. Acum: comanda -> factura -> plata.
t("transfer OP: fara dovada platii -> 200 (comanda intai, plata dupa factura)", (await post("/api/comanda/transfer", {
  packageId: "promo-50", email: "api-fara-dovada@test.ro", contactPhone: "0740000000", companyName: "Firma SRL",
  companyCui: "RO123", companyAddress: "Str. Test 1", title: "Titlu test", body: "x".repeat(150),
  contentDeclaration: true,
})).status === 200);
// Declaratia de continut e obligatorie SI pe server, nu doar bifa din formular:
// altfel oricine trimite direct un POST o ocoleste, iar tocmai ea e temeiul
// pentru care banii nu se restituie daca articolul se dovedeste nepublicabil.
t("transfer OP: fara declaratia de continut -> 400", (await post("/api/comanda/transfer", {
  packageId: "promo-50", email: "api-fara-declaratie@test.ro", contactPhone: "0740000000", companyName: "Firma SRL",
  companyCui: "RO123", companyAddress: "Str. Test 1", title: "Titlu test", body: "x".repeat(150),
})).status === 400);
t("transfer OP: declaratie bifata pe fals -> 400", (await post("/api/comanda/transfer", {
  packageId: "promo-50", email: "api-declaratie-falsa@test.ro", contactPhone: "0740000000", companyName: "Firma SRL",
  companyCui: "RO123", companyAddress: "Str. Test 1", title: "Titlu test", body: "x".repeat(150),
  contentDeclaration: false,
})).status === 400);
// Articolul suspect intra la verificare, nu la facturare: raspunsul spune
// `review: true`, iar factura NU pleaca. Restul comenzii e valid, deci un 400
// aici ar fi gresit — comanda exista, doar plata asteapta.
{
  const r = await post("/api/comanda/transfer", {
    packageId: "promo-50", email: "api-continut-medical@test.ro", contactPhone: "0740000000",
    companyName: "Firma SRL", companyCui: "RO123", companyAddress: "Str. Test 1",
    title: "Tratamentul care vindeca cancerul",
    body: "Bolnavii de cancer se pot vindeca cu un tratament pe baza de sucuri si apa alcalina. " + "x".repeat(100),
    contentDeclaration: true,
  });
  t("transfer OP: articol medical -> oprit inainte de factura", r.status === 200 && r.body?.review === true);
}
t("transfer OP: articol prea scurt -> 400", (await post("/api/comanda/transfer", {
  packageId: "promo-50", email: "a@b.ro", contactPhone: "0740000000", companyName: "Firma SRL",
  companyCui: "RO123", companyAddress: "Str. Test 1", title: "Titlu test", body: "scurt",
  paymentProof: { url: "https://x.ro/a.pdf", name: "a.pdf" },
})).status === 400);
t("transfer OP: fara date de facturare -> 400", (await post("/api/comanda/transfer", {
  packageId: "promo-50", email: "a@b.ro", contactPhone: "0740000000",
  title: "Titlu test", body: "x".repeat(150), paymentProof: { url: "https://x.ro/a.pdf", name: "a.pdf" },
})).status === 400);
t("transfer OP: pachet inexistent -> 400", (await post("/api/comanda/transfer", {
  packageId: "inventat", email: "a@b.ro", contactPhone: "0740000000", companyName: "Firma SRL",
  companyCui: "RO123", companyAddress: "Str. Test 1", title: "Titlu test", body: "x".repeat(150),
  paymentProof: { url: "https://x.ro/a.pdf", name: "a.pdf" },
})).status === 400);
t("transfer OP: url de dovada invalid -> 400", (await post("/api/comanda/transfer", {
  packageId: "promo-50", email: "a@b.ro", contactPhone: "0740000000", companyName: "Firma SRL",
  companyCui: "RO123", companyAddress: "Str. Test 1", title: "Titlu test", body: "x".repeat(150),
  paymentProof: { url: "nu-e-url", name: "a.pdf" },
})).status === 400);
// Puntea telefon->birou: emailul cu linkul de continuare a comenzii OP.
t("oferta/continua: email invalid -> 400", (await post("/api/oferta/continua", {
  email: "gresit", packageId: "promo-50",
})).status === 400);
t("oferta/continua: pachet inexistent -> 400", (await post("/api/oferta/continua", {
  email: "a@b.ro", packageId: "inventat",
})).status === 400);
t("oferta/continua: cerere valida -> 200", (await post("/api/oferta/continua", {
  email: "continua-test@test.ro", packageId: "promo-50",
})).status === 200);
// Declaratia e trimisa corect aici INTENTIONAT: testul verifica tokenul, iar
// fara ea raspunsul ar fi 400 de la validare si n-ar mai ajunge la verificarea
// tokenului — testul ar trece degeaba, pe alt motiv decat cel urmarit.
t("articol/submit: token invalid -> 403", (await post("/api/articol/submit", {
  token: "token-inventat-lung", title: "Titlu test", body: "x".repeat(150),
  contentDeclaration: true,
})).status === 403);
t("articol/submit: fara declaratia de continut -> 400", (await post("/api/articol/submit", {
  token: "token-inventat-lung", title: "Titlu test", body: "x".repeat(150),
})).status === 400);
t("JSON stricat -> 400, nu 500", (await (await fetch(B + "/api/comanda/transfer", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: "{stricat",
})).status) === 400);

console.log("\n########## K. PAGINI SI ROUTING ##########");
t("pagina OP raspunde 200", (await get("/comanda/transfer?pachet=promo-50")).status === 200);
t("pagina OP cazino raspunde 200", (await get("/comanda/transfer?pachet=promo-50-cazino")).status === 200);
t("pagina OP fara parametru merge implicit", (await get("/comanda/transfer")).status === 200);
t("pagina OP cu pachet inventat -> 404", (await get("/comanda/transfer?pachet=inventat")).status === 404);
t("rewrite judet functioneaza", (await get("/publicare-comunicat-cluj")).status === 200);
t("rewrite industrie functioneaza", (await get("/comunicate-presa-imobiliare")).status === 200);
t("judet inexistent -> 404", (await get("/judet/atlantida")).status === 404);
// PDF-ul cu lista: ruta e deschisa intentionat (aceleasi adrese sunt libere pe
// /reteaua-noastra), dar trebuie sa se descarce ca fisier, nu sa se deschida
// ca pagina — altfel omul nu-l are pe telefon cand vrea sa-l trimita mai
// departe, adica exact pentru asta exista.
{
  const r = await fetch(B + "/api/lista-pdf");
  const buf = Buffer.from(await r.arrayBuffer());
  t("lista PDF: raspunde 200", r.status === 200);
  t("lista PDF: e application/pdf", (r.headers.get("content-type") || "").includes("application/pdf"));
  t("lista PDF: se descarca, nu se deschide", /attachment/i.test(r.headers.get("content-disposition") || ""));
  t("lista PDF: are continut valid", buf.length > 3000 && buf.subarray(0, 5).toString() === "%PDF-");
}
t("sitemap e XML", (await get("/sitemap.xml")).ct.includes("xml"));
t("robots.txt e text", (await get("/robots.txt")).ct.includes("text"));
t("pagina inexistenta -> 404", (await get("/pagina-care-nu-exista")).status === 404);

console.log("\n" + "=".repeat(64));
console.log(`TOTAL API: ${n} verificari | ESUATE: ${fails.length}`);
if (fails.length) console.log(fails.map((f) => "  x " + f).join("\n"));
