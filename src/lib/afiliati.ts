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
 * `partener|afiliat|<cod>`.
 *
 * Comisionul: 100 de lei pentru fiecare comanda PLATITA. Se plateste lunar,
 * pe factura partenerului, doar din banii deja incasati.
 *
 * Tabelul se creeaza singur, ca la comanda_inceputa.
 */

export const COMISION_LEI = 100;

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
}): Promise<{ ok: true; afiliat: Afiliat } | { ok: false; eroare: string }> {
  await asiguraTabel();
  const email = d.email.trim().toLowerCase();
  const exista = randuri<Afiliat>(await db.execute(sql`SELECT * FROM "afiliat" WHERE "email" = ${email}`));
  if (exista.length) return { ok: false, eroare: "Există deja un partener cu acest email." };
  const token = randomBytes(24).toString("base64url");
  const r = randuri<Afiliat>(
    await db.execute(sql`INSERT INTO "afiliat" ("cod", "nume", "firma", "cui", "iban", "email", "telefon", "token")
      VALUES (${codDin(d.nume)}, ${d.nume.trim()}, ${d.firma.trim()}, ${d.cui.trim()}, ${d.iban.replace(/\s+/g, "").toUpperCase()}, ${email}, ${d.telefon.trim()}, ${token})
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
      WHERE "source" = ${sursa} AND "status" = 'paid'`),
  );
  const op = randuri<{ created_at: Date; package_id: string; status: string }>(
    await db.execute(sql`SELECT "created_at", "package_id", "status" FROM "order_submission"
      WHERE "source" = ${sursa} AND "payment_method" = 'op'`),
  );
  const toate: ComandaAfiliat[] = [
    ...card.map((c) => ({
      data: c.created_at,
      pachet: findPackageById(c.package_id)?.name || c.package_id,
      sumaLei: Math.round(Number(c.amount) / 100),
      platita: true,
    })),
    ...op.map((o) => ({
      data: o.created_at,
      pachet: findPackageById(o.package_id)?.name || o.package_id,
      sumaLei: findPackageById(o.package_id)?.price ?? 0,
      platita: o.status === "paid" || o.status === "published",
    })),
  ];
  return toate.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}
