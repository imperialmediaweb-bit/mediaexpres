/**
 * Listeaza seriile din contul StartCo, ca sa afli ce pui in STARTCO_SERIES.
 *
 * Rulare:
 *   STARTCO_TOKEN=pk_prod_xxx node scripts/startco-series.mjs
 *
 * Tokenul se citeste doar din mediu — nu il scrie in fisier.
 */

const token = process.env.STARTCO_TOKEN;

if (!token) {
  console.error("Lipseste STARTCO_TOKEN.");
  console.error("Ruleaza:  STARTCO_TOKEN=pk_prod_xxx node scripts/startco-series.mjs");
  process.exit(1);
}

const res = await fetch("https://api.cloud.startco.ro/developer/series", {
  headers: { Authorization: token },
});

const text = await res.text();

if (!res.ok) {
  console.error(`\nStartCo a raspuns ${res.status}:\n${text}\n`);
  if (res.status === 401) {
    console.error("401 = token invalid sau revocat. Verifica-l in StartCo → Token-uri API.");
  }
  process.exit(1);
}

let series;
try {
  series = JSON.parse(text);
} catch {
  console.error("Raspuns non-JSON de la StartCo:\n", text);
  process.exit(1);
}

if (!Array.isArray(series) || series.length === 0) {
  console.log("\nNu exista nicio serie in cont. Creeaza una in StartCo inainte de a factura.\n");
  process.exit(0);
}

const invoices = series.filter((s) => s.type === "invoice");
const receipts = series.filter((s) => s.type !== "invoice");

console.log("\n=== SERII DE FACTURA (astea te intereseaza) ===");
if (invoices.length === 0) {
  console.log("  (niciuna — trebuie sa creezi o serie de tip 'invoice' in StartCo)");
} else {
  for (const s of invoices) {
    console.log(`  id=${s.id}   nume="${s.name}"`);
  }
  console.log(`\n  → In Railway pune:  STARTCO_SERIES=${invoices[0].name}`);
  if (invoices.length > 1) {
    console.log("     (daca vrei alta din lista, pune numele ei exact)");
  }
}

if (receipts.length > 0) {
  console.log("\n=== Alte serii (chitante etc.) — NU se pun in STARTCO_SERIES ===");
  for (const s of receipts) {
    console.log(`  id=${s.id}   nume="${s.name}"   tip=${s.type}`);
  }
}

console.log("");
