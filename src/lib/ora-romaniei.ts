/**
 * Ora scrisa in campurile de programare e MEREU ora Romaniei.
 *
 * `datetime-local` nu are fus: da doar „2026-09-15T09:30", iar `new Date(...)`
 * o interpreteaza in fusul calculatorului. Pe un laptop lasat pe UTC sau pe
 * telefon in alta tara, emailul programat pentru 9:30 pleca la 12:30 — si
 * aflai abia de la client.
 *
 * Aici fixam fusul: ce scrii inseamna ora de la Bucuresti, indiferent unde
 * esti si ce arata ceasul calculatorului. Ora de vara se rezolva singura,
 * fiindca offsetul se calculeaza la data ceruta, nu la cea de azi.
 */

const FUS = "Europe/Bucharest";

/** Cat e offsetul fusului romanesc (in ms) la un moment dat. */
function offsetLa(utcMs: number): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: FUS,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(new Date(utcMs))) p[part.type] = part.value;
  const caAndCumArata = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    // La miezul noptii unele locale dau „24"; il aducem la 0.
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  );
  return caAndCumArata - utcMs;
}

/**
 * „2026-09-15T09:30" (ora Romaniei) → ISO in UTC, gata de trimis la Resend.
 * Intoarce null daca textul nu e o data valida.
 */
export function isoDinOraRomaniei(local: string): string | null {
  const m = local.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, Y, M, D, h, min] = m;
  const presupus = Date.UTC(Number(Y), Number(M) - 1, Number(D), Number(h), Number(min));
  // Prima corectie ne duce aproape; a doua rezolva si cazul rar in care
  // momentul cade chiar in ora cand se schimba ora de vara.
  let ms = presupus - offsetLa(presupus);
  ms = presupus - offsetLa(ms);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Cum aratam clientului o programare: mereu cu ora Romaniei. */
export function formatOraRomaniei(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ro-RO", {
    timeZone: FUS,
    dateStyle: "medium",
    timeStyle: "short",
  });
}
