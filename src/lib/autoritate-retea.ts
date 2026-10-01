import { sql } from "drizzle-orm";
import { db } from "@/db";
import { NEWSPAPERS } from "@/data/newspapers";
import { domeniuDin, mozDA } from "@/lib/autoritate";

/**
 * Autoritatea (Moz DA / PA) a ziarelor NOASTRE, citita de noi (01.10.2026).
 *
 * Cerut de proprietar dupa ce o agentie a intrebat „unde gasesc lista cu
 * domeniile dvs. cu DA, DR, TF?". Pana acum aveam o singura cifra generala
 * („DA 37"). Acum: scorul pe fiecare domeniu, reimprospatat la 30 de zile din
 * planificatorul intern, afisat pe /reteaua-noastra si in PDF-ul cu lista.
 * DR (Ahrefs) si TF (Majestic) NU le avem si nu le inventam.
 */

export const ZILE_INTRE_MASURATORI = 30;
const ZI = 24 * 60 * 60 * 1000;

export interface AutoritateZiar {
  domain: string;
  da: number | null;
  pa: number | null;
  spam: number | null;
  checkedAt: Date;
}

let gata: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!gata) {
    gata = db
      .execute(
        sql`CREATE TABLE IF NOT EXISTS "newspaper_authority" (
          "domain" text PRIMARY KEY NOT NULL,
          "da" integer,
          "pa" integer,
          "spam" integer,
          "checked_at" timestamp DEFAULT now() NOT NULL
        )`,
      )
      .then(() => undefined)
      .catch((e) => {
        gata = null;
        console.error("[autoritate-retea] tabel", e);
      });
  }
  return gata;
}

/** Domeniile retelei, in ordinea din lista. */
export function domeniileRetelei(): string[] {
  return NEWSPAPERS.map((n) => domeniuDin(n.url)).filter((d): d is string => Boolean(d));
}

/** Scorurile salvate, pe domeniu. Gol daca baza nu raspunde. */
export async function citesteAutoritateaRetelei(): Promise<Map<string, AutoritateZiar>> {
  try {
    await ensureTable();
    const r = await db.execute(sql`SELECT domain, da, pa, spam, checked_at FROM "newspaper_authority"`);
    const rows = (r as unknown as { rows?: Record<string, unknown>[] }).rows ?? (r as unknown as Record<string, unknown>[]);
    const m = new Map<string, AutoritateZiar>();
    for (const x of rows) {
      m.set(String(x.domain), {
        domain: String(x.domain),
        da: x.da == null ? null : Number(x.da),
        pa: x.pa == null ? null : Number(x.pa),
        spam: x.spam == null ? null : Number(x.spam),
        checkedAt: new Date(x.checked_at as string),
      });
    }
    return m;
  } catch (e) {
    console.error("[autoritate-retea] citire:", e);
    return new Map();
  }
}

/**
 * Masoara domeniile fara scor sau cu scorul mai vechi de 30 de zile, cateva
 * pe rand (Moz e rar si costa rows). Idempotent: rulat de doua ori, a doua
 * oara nu mai are ce masura.
 */
export async function actualizeazaAutoritateaRetelei(maxim = 60): Promise<{ masurate: number; esuate: number; ramase: number }> {
  await ensureTable();
  if (!process.env.MOZ_API_TOKEN) return { masurate: 0, esuate: 0, ramase: 0 };
  const existente = await citesteAutoritateaRetelei();
  const prag = Date.now() - ZILE_INTRE_MASURATORI * ZI;
  const deMasurat = domeniileRetelei().filter((d) => {
    const e = existente.get(d);
    return !e || e.checkedAt.getTime() < prag || e.da == null;
  });
  let masurate = 0;
  let esuate = 0;
  for (const d of deMasurat.slice(0, maxim)) {
    const r = await mozDA(d);
    if (!r) {
      esuate++;
      continue;
    }
    await db.execute(sql`
      INSERT INTO "newspaper_authority" (domain, da, pa, spam, checked_at)
      VALUES (${d}, ${r.domainAuthority}, ${r.pageAuthority}, ${r.spamScore}, now())
      ON CONFLICT (domain) DO UPDATE SET da = EXCLUDED.da, pa = EXCLUDED.pa, spam = EXCLUDED.spam, checked_at = now()
    `);
    masurate++;
    // Moz limiteaza ritmul; o pauza scurta intre apeluri.
    await new Promise((res) => setTimeout(res, 400));
  }
  return { masurate, esuate, ramase: Math.max(0, deMasurat.length - maxim) };
}

/** Media DA a retelei si data celei mai vechi masuratori — pentru textul de pe pagina. */
export function rezumatAutoritate(m: Map<string, AutoritateZiar>): { medie: number; nr: number; masuratLa: Date } | null {
  const cu = Array.from(m.values()).filter((x) => x.da != null);
  if (!cu.length) return null;
  const medie = Math.round(cu.reduce((s, x) => s + (x.da as number), 0) / cu.length);
  const masuratLa = new Date(Math.min(...cu.map((x) => x.checkedAt.getTime())));
  return { medie, nr: cu.length, masuratLa };
}

/** domeniu → DA, pentru PDF si pagini; gol daca baza nu raspunde. */
export async function autoritatePentruPdf(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    for (const [d, a] of await citesteAutoritateaRetelei()) if (a.da != null) out[d] = a.da;
  } catch {
    /* fara scoruri */
  }
  return out;
}
