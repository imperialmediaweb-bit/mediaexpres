import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

/**
 * 28.11.2026 (owner: „cum să nu se mai oprească?") — unde se opresc oamenii in
 * formularul de comanda. Fiecare vizitator are un id aleator (sid, din
 * browser); numaram vizitatorii UNICI pe pas si pe zi, plus mesajele de
 * validare la care s-au lovit. Volumul e mic (zeci pe zi), deci tine intr-un
 * singur rand din app_setting, ultimele 30 de zile.
 */
export const PASI_FUNNEL = [
  "deschis",
  "email_telefon",
  "cui_gasit",
  "articol",
  "dupa_plata",
  "apasat_trimite",
  "eroare",
  "trimis",
  "ajutor_chat",
  "ajutor_whatsapp",
  "ajutor_suna",
] as const;
export type PasFunnel = (typeof PASI_FUNNEL)[number];

const CHEIE = "funnel_comanda";
type Zi = { pasi: Record<string, string[]>; erori: Record<string, number> };
type Date_ = Record<string, Zi>;

function ziRo(d = new Date()): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Bucharest" });
}

async function citeste(): Promise<Date_> {
  const [r] = await db.select().from(appSettings).where(eq(appSettings.key, CHEIE)).limit(1);
  if (!r) return {};
  try {
    return JSON.parse(r.value) as Date_;
  } catch {
    return {};
  }
}

export async function inregistreazaPas(sid: string, pas: PasFunnel, eroare?: string): Promise<void> {
  const date = await citeste();
  const zi = ziRo();
  const z: Zi = date[zi] || { pasi: {}, erori: {} };
  const lista = z.pasi[pas] || [];
  if (!lista.includes(sid)) lista.push(sid);
  z.pasi[pas] = lista.slice(-2000);
  if (pas === "eroare" && eroare) {
    const k = eroare.slice(0, 90);
    z.erori[k] = (z.erori[k] || 0) + 1;
  }
  date[zi] = z;
  // Doar ultimele 30 de zile.
  const pastrate = Object.keys(date).sort().slice(-30);
  const curat: Date_ = {};
  for (const k of pastrate) curat[k] = date[k];
  const value = JSON.stringify(curat);
  await db
    .insert(appSettings)
    .values({ key: CHEIE, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}

/** Rezumat pe ultimele `zile` zile: vizitatori unici pe pas + erorile cele mai dese. */
export async function rezumatFunnel(zile = 7) {
  const date = await citeste();
  const chei = Object.keys(date).sort().slice(-zile);
  const unici: Record<string, Set<string>> = {};
  const erori: Record<string, number> = {};
  const peZi: Record<string, Record<string, number>> = {};
  for (const k of chei) {
    peZi[k] = {};
    for (const [pas, sids] of Object.entries(date[k].pasi)) {
      peZi[k][pas] = sids.length;
      unici[pas] = unici[pas] || new Set();
      for (const s of sids) unici[pas].add(s);
    }
    for (const [m, n] of Object.entries(date[k].erori || {})) erori[m] = (erori[m] || 0) + n;
  }
  const total: Record<string, number> = {};
  for (const p of PASI_FUNNEL) total[p] = unici[p]?.size || 0;
  return {
    zile: chei,
    total,
    erori: Object.entries(erori).sort((a, b) => b[1] - a[1]).slice(0, 15),
    pe_zi: peZi,
  };
}
