// Scenariile de clienti, trimise LIVE consultantului.
//
// Toate celelalte suite simuleaza consultantul (nu au cheie de model). Aici
// e invers: intrebarile reale, asa cum le scriu oamenii — scurt, cu greseli,
// sceptic, tehnic — pleaca la /api/advisor si raspunsurile se judeca dupa
// reguli: fara refuzul-sablon, cu cifrele corecte, fara promisiuni pe care
// nu le tinem, cu eticheta de actiune potrivita, scurt. Raportul complet, cu
// fiecare raspuns, se scrie in scratchpad ca sa fie citit de un om.
//
//   node tests/advisor-scenarios.mjs                     # local (are nevoie de OPENAI_API_KEY)
//   node tests/advisor-scenarios.mjs https://mediaexpress.ro   # productie
import fs from "node:fs";

const B = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const OUT = "/tmp/claude-0/-home-user/ab7e5911-6425-5af0-b251-537fbc61eed5/scratchpad/advisor-scenarii.md";

const REFUZ = /Sunt consultantul rețelei MediaExpres și vă pot ajuta/i;
// Lucruri pe care consultantul NU are voie sa le spuna, oricare ar fi intrebarea.
const INTERZISE = [
  [/24 de ore/i, "termenul vechi (24 de ore)"],
  [/factura (se emite|vine) automat/i, "factura nu e automata"],
  [/garant[aă]m (pozi|locul|prima pagin[aă] (in|în) google)/i, "garantie de pozitii"],
  [/mii de vizitatori/i, "promite trafic"],
  [/\bDR\s*\d/i, "inventeaza DR (Ahrefs)"],
  [/\bAI\b/i, "spune „AI”"],
  [/\*\*|^#|^- /m, "markdown in raspuns"],
];

/**
 * Fiecare scenariu: cine e omul, ce scrie (exact asa, cu greselile lui),
 * ce TREBUIE sa apara in raspuns (oricare din alternative) si actiunea
 * asteptata. `interzis` = ceva ce n-are voie sa apara la intrebarea asta.
 */
const SCENARII = [
  // — firma mica, prima data
  { profil: "firma mica", q: "cat costa?", cere: [/500/, /50 de ziare|50 ziare|toate cele 50/i], actiune: "comanda" },
  { profil: "firma mica", q: "pret", cere: [/500/] },
  { profil: "firma mica", q: "ce primesc pentru banii astia", cere: [/50/, /link|raport|facebook/i] },
  { profil: "firma mica", q: "nu am articol scris", cere: [/scriem noi|redact|il scriem|îl scriem/i] },
  { profil: "firma mica", q: "cat dureaza pana apare", cere: [/12 ore lucr/i] },
  { profil: "firma mica", q: "cum platesc", cere: [/card/i, /OP|transfer|ordin/i], actiune: "comanda" },
  { profil: "firma mica", q: "primesc factura?", cere: [/factur/i], interzis: /automat/i },
  { profil: "firma mica", q: "pot sa platesc dupa ce vad articolele?", cere: [/banii înapoi|banii inapoi|12 ore/i] },
  { profil: "firma mica", q: "vreau sa comand", cere: [/buton|Comand/i], actiune: "comanda" },

  // — expert SEO / agentie
  { profil: "expert SEO", q: "seo", cere: [/dofollow|DA 36|36-37|autoritate/i] },
  { profil: "expert SEO", q: "este ok pentru seo?", cere: [/dofollow|36/i], interzis: REFUZ },
  { profil: "expert SEO", q: "ce DA au domeniile? dar DR?", cere: [/36/], interzis: /\bDR\s*\d/ },
  { profil: "expert SEO", q: "linkurile sunt dofollow? cate pot pune?", cere: [/dofollow/i, /3/] },
  { profil: "expert SEO", q: "e PBN? nu ma penalizeaza google?", cere: [/redac|reale|1\.200|articole/i] },
  { profil: "expert SEO", q: "pot trimite eu 50 de texte diferite?", cere: [/nu e nevoie|rescriem|noi/i] },
  { profil: "expert SEO", q: "suntem agentie, facturati pe noi? aveti discount la volum?", cere: [/agen|factur/i, /WhatsApp|abonament/i] },
  { profil: "expert SEO", q: "ce contine raportul", cere: [/URL|link/i, /PDF|Excel/i] },

  // — scepticul
  { profil: "sceptic", q: "sunt site-uri reale sau fantoma?", cere: [/reale|redac|lista/i] },
  { profil: "sceptic", q: "ce trafic au ziarele astea? am verificat si nu au nimic", cere: [/nu vindem trafic|câteva sute|cateva sute|20\.000/i] },
  { profil: "sceptic", q: "nu face banii", cere: [/10 lei|150|link/i] },
  { profil: "sceptic", q: "imi aduce clienti?", cere: [/nu promitem|autoritate|apari/i] },
  { profil: "sceptic", q: "ce garantie am ca nu ma teapa", cere: [/banii înapoi|banii inapoi|12 ore|lista/i] },
  { profil: "sceptic", q: "de ce e 500 daca normal e 1500? care e smecheria", cere: [/clien[tț]i noi|ofert|promo/i] },

  // — cazino / continut sensibil
  { profil: "cazino", q: "am un articol despre un site de pariuri", cere: [/1\.000|1000/, /ONJN|declar/i] },
  { profil: "sensibil", q: "vreau sa public despre un supliment care ajuta la diabet", cere: [/nu public|tratament|declar/i] },

  // — institutie
  { profil: "institutie", q: "suntem primarie, cum facturati si ce documente ne dati", cere: [/factur/i, /contract|OP|WhatsApp/i] },

  // — client vechi
  { profil: "client vechi", q: "am comandat ieri, ce e cu comanda mea?", cere: [/comanda/i], actiune: "stare" },
  { profil: "client vechi", q: "am platit, unde trimit dovada?", cere: [/dovad/i], actiune: "dovada" },
  { profil: "client vechi", q: "vreau sa trimit articolul si pozele pt comanda mea", cere: [/articol/i], actiune: "articol" },
  { profil: "client vechi", q: "se sterge articolul dupa o perioada?", cere: [/permanent|nu se [sș]terge/i] },

  // — geografie
  { profil: "geografie", q: "aveti ziar in cluj?", cere: [/Cluj Expres/i, /clujexpres\.ro/i] },
  { profil: "geografie", q: "cluj", cere: [/Cluj Expres/i] },
  { profil: "geografie", q: "vreau doar in judetul meu, bacau", cere: [/Bac[aă]u Expres/i, /Local|500/i] },

  // — facebook
  { profil: "facebook", q: "apare si pe facebook?", cere: [/da/i, /50|2,4/] },
  { profil: "facebook", q: "puteti sa promovati postarile?", cere: [/nu e inclus|WhatsApp/i] },

  // — altele
  { profil: "altele", q: "articol in engleza se poate?", cere: [/rom[aâ]n|WhatsApp/i] },
  { profil: "altele", q: "puteti publica azi?", cere: [/12 ore|a doua zi/i] },
  { profil: "altele", q: "am 3 articole, cat ma costa", cere: [/500/, /abonament|WhatsApp|fiecare/i] },
  { profil: "altele", q: "pot vorbi cu un om?", cere: [/WhatsApp|\+40/i] },

  // — off-topic: refuz scurt, o data, cu oferta de ajutor
  { profil: "off-topic", q: "cum imi fac un site de prezentare?", cere: [/50 de ziare|public|pre[tț]/i] },
];

async function ask(q) {
  const t = Date.now();
  const res = await fetch(B + "/api/advisor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: q }] }),
  });
  const j = await res.json().catch(() => ({}));
  return { status: res.status, answer: j.answer || "", action: j.action ?? null, ms: Date.now() - t, error: j.error };
}

const rows = [];
let fails = 0;
for (const s of SCENARII) {
  const r = await ask(s.q);
  const probleme = [];
  if (r.status !== 200 || !r.answer) probleme.push(`HTTP ${r.status}: ${r.error || "fara raspuns"}`);
  else {
    if (s.profil !== "off-topic" && REFUZ.test(r.answer)) probleme.push("refuzul-sablon");
    for (const re of s.cere) if (!re.test(r.answer)) probleme.push(`lipseste ${re}`);
    if (s.interzis && s.interzis.test(r.answer)) probleme.push(`contine interzis ${s.interzis}`);
    for (const [re, de_ce] of INTERZISE) if (re.test(r.answer)) probleme.push(de_ce);
    if (s.actiune && r.action !== s.actiune) probleme.push(`actiune ${r.action} (asteptat ${s.actiune})`);
    if (r.answer.length > 1100) probleme.push(`prea lung (${r.answer.length})`);
    if (/\[\[/.test(r.answer)) probleme.push("eticheta a ramas in text");
  }
  const ok = probleme.length === 0;
  if (!ok) fails++;
  console.log(`${ok ? "  OK  " : " FAIL "} [${s.profil}] „${s.q}” (${r.ms}ms)${ok ? "" : " — " + probleme.join("; ")}`);
  rows.push({ ...s, ...r, probleme });
}

const md = [
  `# Consultantul, pe scenarii — ${B} — ${new Date().toISOString().slice(0, 16)}`,
  "",
  `${SCENARII.length - fails}/${SCENARII.length} OK`,
  "",
  ...rows.flatMap((r) => [
    `## [${r.profil}] ${r.q}`,
    "",
    r.answer || `(HTTP ${r.status}: ${r.error})`,
    "",
    `*actiune: ${r.action ?? "—"} · ${r.ms}ms${r.probleme.length ? " · **" + r.probleme.join("; ") + "**" : ""}*`,
    "",
  ]),
].join("\n");
fs.mkdirSync(OUT.slice(0, OUT.lastIndexOf("/")), { recursive: true });
fs.writeFileSync(OUT, md);
console.log(`\n${SCENARII.length - fails}/${SCENARII.length} OK — raportul cu toate raspunsurile: ${OUT}`);
process.exit(fails ? 1 : 0);
