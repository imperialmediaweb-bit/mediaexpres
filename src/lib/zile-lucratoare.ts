/**
 * Zile lucratoare in Romania, pentru termenele date partenerilor.
 *
 * 14.09.2026 — publicatia partenera refuza in 2 zile lucratoare si publica in
 * 3. Fara fisierul asta, „3 zile lucratoare" ar fi fost 3 zile calendaristice
 * si am fi expirat parteneri peste Paste sau in 1-2 mai, adica exact cand ei
 * chiar nu aveau cum sa publice. Termenul se calculeaza O SINGURA DATA, la
 * trimitere, si se scrie pe plasare: daca lista de sarbatori se schimba peste
 * un an, termenele deja promise raman cele promise.
 *
 * Ora Romaniei conteaza: serverul ruleaza pe UTC, iar o plasare trimisa
 * vineri la 23:30 ora Romaniei e tot vineri, nu sambata.
 */

const ZI = 86_400_000;

/** Paștele ortodox (calendar iulian, convertit la gregorian) pentru un an. */
export function pasteOrtodox(an: number): Date {
  // Algoritmul lui Meeus pentru Pastele iulian.
  const a = an % 4;
  const b = an % 7;
  const c = an % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const luna = Math.floor((d + e + 114) / 31);
  const zi = ((d + e + 114) % 31) + 1;
  // Iulian -> gregorian: +13 zile pentru secolele XX-XXI.
  const iulian = Date.UTC(an, luna - 1, zi);
  return new Date(iulian + 13 * ZI);
}

/** „2026-05-01" pentru o data, in ora Romaniei. */
function cheiaZilei(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Sarbatorile legale nelucratoare din Romania, pentru anul dat. */
export function sarbatoriLegale(an: number): Set<string> {
  const fixe = [
    [1, 1], [1, 2], [1, 6], [1, 7], // Anul Nou, Boboteaza, Sf. Ion
    [1, 24],                        // Unirea Principatelor
    [5, 1],                         // Ziua Muncii
    [6, 1],                         // Ziua Copilului
    [8, 15],                        // Adormirea Maicii Domnului
    [11, 30],                       // Sf. Andrei
    [12, 1],                        // Ziua Nationala
    [12, 25], [12, 26],             // Craciun
  ];
  const zile = new Set<string>(
    fixe.map(([l, z]) => `${an}-${String(l).padStart(2, "0")}-${String(z).padStart(2, "0")}`),
  );
  // Mobile: Vinerea Mare, Pastele (duminica + luni), Rusaliile (+49, +50).
  const paste = pasteOrtodox(an);
  for (const offset of [-2, 0, 1, 49, 50]) {
    zile.add(cheiaZilei(new Date(paste.getTime() + offset * ZI)));
  }
  return zile;
}

const cache = new Map<number, Set<string>>();
function sarbatori(an: number): Set<string> {
  let s = cache.get(an);
  if (!s) {
    s = sarbatoriLegale(an);
    cache.set(an, s);
  }
  return s;
}

/** Ziua saptamanii in ora Romaniei: 0 = duminica. */
function ziSaptamanii(d: Date): number {
  const s = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Bucharest", weekday: "short" }).format(d);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(s);
}

export function eZiLucratoare(d: Date): boolean {
  const zi = ziSaptamanii(d);
  if (zi === 0 || zi === 6) return false;
  const cheie = cheiaZilei(d);
  const an = Number(cheie.slice(0, 4));
  return !sarbatori(an).has(cheie);
}

/**
 * `n` zile lucratoare dupa `de la`. Ziua de start nu se numara: o plasare
 * trimisa luni la 16:00 cu termen de 2 zile expira miercuri, nu marti.
 * Ora se pastreaza, deci termenul e „miercuri la 16:00".
 */
export function adaugaZileLucratoare(dela: Date, n: number): Date {
  let d = new Date(dela.getTime());
  let ramase = Math.max(0, Math.trunc(n));
  let pas = 0;
  while (ramase > 0) {
    d = new Date(d.getTime() + ZI);
    if (eZiLucratoare(d)) ramase--;
    // Plasa: 400 de pasi inseamna un an intreg de sarbatori, e imposibil.
    if (++pas > 400) break;
  }
  return d;
}
