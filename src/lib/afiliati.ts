import { randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { findPackageById } from "@/data/packages";

/**
 * 31.10.2026 — programul de recomandari: freelanceri, bloggeri, vloggeri,
 * agentii — doar cu PFA sau firma, ca sa poata factura comisionul.
 *
 * Partenerul primeste un link (/p/<cod>) care duce la oferta cu
 * utm_source=partener&utm_campaign=<cod>. Sistemul de surse (lib/sursa.ts)
 * retine asta 90 de zile si o scrie pe comanda, deci nu e nevoie de nicio
 * coloana noua pe comenzi: o comanda e a partenerului daca sursa ei e
 * `partener|afiliat|<cod>` (din 13.11.2026 poate urma `|/pagina-de-intrare`, vezi lib/sursa.ts).
 *
 * Comisionul: 100 de lei pentru fiecare comanda PLATITA. Se plateste lunar,
 * pe factura partenerului, doar din banii deja incasati.
 *
 * Tabelul se creeaza singur, ca la comanda_inceputa.
 */

export const COMISION_LEI = 100;
/** 02.11.2026 — primul client platit aduce mai mult: primul succes ii tine motivati. */
export const COMISION_PRIMUL_LEI = 150;

export interface Afiliat {
  id: number;
  cod: string;
  nume: string;
  firma: string;
  cui: string;
  iban: string;
  email: string;
  telefon: string;
  token: string;
  clickuri: number;
  created_at: Date;
  /** 13.11.2026: "firma" (PFA/firma, bani pe factura) sau "persoana" (vouchere eMAG). */
  tip: string;
}

let gata: Promise<unknown> | null = null;
function asiguraTabel() {
  if (!gata) {
    gata = db.execute(sql`CREATE TABLE IF NOT EXISTS "afiliat" (
      "id" serial PRIMARY KEY,
      "cod" text NOT NULL UNIQUE,
      "nume" text NOT NULL,
      "firma" text NOT NULL,
      "cui" text NOT NULL,
      "iban" text NOT NULL,
      "email" text NOT NULL UNIQUE,
      "telefon" text NOT NULL,
      "token" text NOT NULL UNIQUE,
      "clickuri" integer NOT NULL DEFAULT 0,
      "created_at" timestamp NOT NULL DEFAULT now()
    )`);
    gata = gata.then(() =>
      Promise.all([
        db.execute(sql`ALTER TABLE "afiliat" ADD COLUMN IF NOT EXISTS "tip" text NOT NULL DEFAULT 'firma'`),
        db.execute(sql`CREATE TABLE IF NOT EXISTS "afiliat_voucher" (
          "id" serial PRIMARY KEY,
          "afiliat_id" integer NOT NULL,
          "suma" integer NOT NULL,
          "cod" text NOT NULL,
          "nota" text,
          "trimis_la" timestamp NOT NULL DEFAULT now()
        )`),
      ]),
    );
    gata.catch(() => (gata = null));
  }
  return gata;
}

function randuri<T>(r: unknown): T[] {
  return (r as { rows?: T[] }).rows ?? (r as T[]);
}

/** „Ion Popescu” -> „ion-popescu-k3”. Doar caractere pe care sursa le pastreaza. */
function codDin(nume: string): string {
  const baza = nume
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `${baza || "partener"}-${randomBytes(2).toString("hex")}`;
}

export async function creeazaAfiliat(d: {
  nume: string;
  firma: string;
  cui: string;
  iban: string;
  email: string;
  telefon: string;
  tip?: "firma" | "persoana";
}): Promise<{ ok: true; afiliat: Afiliat } | { ok: false; eroare: string }> {
  await asiguraTabel();
  const email = d.email.trim().toLowerCase();
  const exista = randuri<Afiliat>(await db.execute(sql`SELECT * FROM "afiliat" WHERE "email" = ${email}`));
  if (exista.length) return { ok: false, eroare: "Există deja un partener cu acest email." };
  const token = randomBytes(24).toString("base64url");
  const r = randuri<Afiliat>(
    await db.execute(sql`INSERT INTO "afiliat" ("cod", "nume", "firma", "cui", "iban", "email", "telefon", "token", "tip")
      VALUES (${codDin(d.nume)}, ${d.nume.trim()}, ${d.firma.trim()}, ${d.cui.trim()}, ${d.iban.replace(/\s+/g, "").toUpperCase()}, ${email}, ${d.telefon.trim()}, ${token}, ${d.tip || "firma"})
      RETURNING *`),
  );
  return { ok: true, afiliat: r[0] };
}

export async function afiliatDupaToken(token: string): Promise<Afiliat | null> {
  await asiguraTabel();
  return randuri<Afiliat>(await db.execute(sql`SELECT * FROM "afiliat" WHERE "token" = ${token}`))[0] ?? null;
}

/** Numara clickul si intoarce partenerul; null daca linkul nu exista. */
export async function clickAfiliat(cod: string): Promise<Afiliat | null> {
  await asiguraTabel();
  return (
    randuri<Afiliat>(
      await db.execute(sql`UPDATE "afiliat" SET "clickuri" = "clickuri" + 1 WHERE "cod" = ${cod} RETURNING *`),
    )[0] ?? null
  );
}

export interface ComandaAfiliat {
  data: Date;
  pachet: string;
  sumaLei: number;
  platita: boolean;
  /** Comisionul pentru comanda asta: 0 pana e platita, 150 la prima platita, apoi 100. */
  comision: number;
}

/**
 * Comenzile aduse de partener: cardul (tabelul order, platite) si transferul
 * (order_submission prin OP). Fara datele clientului — partenerul vede doar
 * ca a venit o comanda, nu cine e.
 */
export async function comenziAfiliat(cod: string): Promise<ComandaAfiliat[]> {
  const sursa = `partener|afiliat|${cod}`;
  const card = randuri<{ created_at: Date; package_id: string; amount: number }>(
    await db.execute(sql`SELECT "created_at", "package_id", "amount" FROM "order"
      WHERE ("source" = ${sursa} OR "source" LIKE ${sursa + "|%"}) AND "status" = 'paid'`),
  );
  const op = randuri<{ created_at: Date; package_id: string; status: string }>(
    await db.execute(sql`SELECT "created_at", "package_id", "status" FROM "order_submission"
      WHERE ("source" = ${sursa} OR "source" LIKE ${sursa + "|%"}) AND "payment_method" = 'op'`),
  );
  const toate: ComandaAfiliat[] = [
    ...card.map((c) => ({
      data: c.created_at,
      pachet: findPackageById(c.package_id)?.name || c.package_id,
      sumaLei: Math.round(Number(c.amount) / 100),
      platita: true,
      comision: 0,
    })),
    ...op.map((o) => ({
      data: o.created_at,
      pachet: findPackageById(o.package_id)?.name || o.package_id,
      sumaLei: findPackageById(o.package_id)?.price ?? 0,
      platita: o.status === "paid" || o.status === "published",
      comision: 0,
    })),
  ];
  // Prima comanda platita, in ordinea in care au venit, primeste bonusul.
  const cronologic = [...toate].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  let primaGasita = false;
  for (const c of cronologic) {
    if (!c.platita) continue;
    c.comision = primaGasita ? COMISION_LEI : COMISION_PRIMUL_LEI;
    primaGasita = true;
  }
  return toate.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

/* ------------------------------------------------------------------ */
/* 13.11.2026 — vouchere eMAG pentru partenerii persoane fizice.        */
/* Proprietarul cumpara cardurile cadou de pe eMAG (pe firma, cu        */
/* factura) si trimite codul din admin; aici doar tinem socoteala.      */
/* ------------------------------------------------------------------ */

export interface VoucherTrimis {
  id: number;
  afiliat_id: number;
  suma: number;
  cod: string;
  nota: string | null;
  trimis_la: Date;
}

export async function voucherePartener(afiliatId: number): Promise<VoucherTrimis[]> {
  await asiguraTabel();
  return randuri<VoucherTrimis>(
    await db.execute(sql`SELECT * FROM "afiliat_voucher" WHERE "afiliat_id" = ${afiliatId} ORDER BY "trimis_la" DESC`),
  );
}

export interface SituatiePartener {
  afiliat: Afiliat;
  clienti: number;
  castigat: number;
  trimis: number;
  deTrimis: number;
}

/** Toti partenerii, cu cat au castigat, cat li s-a dat si cat mai e de dat. */
export async function situatieParteneri(): Promise<SituatiePartener[]> {
  await asiguraTabel();
  const toti = randuri<Afiliat>(await db.execute(sql`SELECT * FROM "afiliat" ORDER BY "created_at" DESC`));
  const out: SituatiePartener[] = [];
  for (const a of toti) {
    const comenzi = await comenziAfiliat(a.cod);
    const castigat = comenzi.reduce((s, c) => s + c.comision, 0);
    const trimis = (await voucherePartener(a.id)).reduce((s, v) => s + v.suma, 0);
    out.push({ afiliat: a, clienti: comenzi.filter((c) => c.platita).length, castigat, trimis, deTrimis: Math.max(0, castigat - trimis) });
  }
  return out;
}

export async function afiliatDupaId(id: number): Promise<Afiliat | null> {
  await asiguraTabel();
  return randuri<Afiliat>(await db.execute(sql`SELECT * FROM "afiliat" WHERE "id" = ${id}`))[0] ?? null;
}

export async function inregistreazaVoucher(afiliatId: number, suma: number, cod: string, nota?: string) {
  await asiguraTabel();
  return randuri<VoucherTrimis>(
    await db.execute(sql`INSERT INTO "afiliat_voucher" ("afiliat_id", "suma", "cod", "nota")
      VALUES (${afiliatId}, ${suma}, ${cod}, ${nota || null}) RETURNING *`),
  )[0];
}
