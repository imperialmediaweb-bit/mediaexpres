import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto("http://localhost:3000/oferta-500", { waitUntil: "networkidle" });
const t = await p.locator("body").innerText();
console.log("=== PRIMUL ECRAN (telefon 390x844), text in ordine ===");
console.log(t.split("\n").filter(Boolean).slice(0, 22).join("\n"));
