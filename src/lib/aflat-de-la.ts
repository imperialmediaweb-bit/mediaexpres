import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * 19.11.2026 — „De unde ați aflat de noi?", bifat obligatoriu in formularul de
 * comanda. Tabel separat (cheia = referinta comenzii, stripe_session_id), ca sa
 * nu atingem schema order_submission citita in 30 de locuri.
 */
export { VARIANTE_AFLAT } from "@/lib/aflat-de-la-variante";

let gata: Promise<unknown> | null = null;
function asiguraTabel() {
  if (!gata) {
    gata = db.execute(sql`CREATE TABLE IF NOT EXISTS "aflat_de_la" (
      "ref" text PRIMARY KEY,
      "raspuns" text NOT NULL,
      "created_at" timestamp NOT NULL DEFAULT now()
    )`);
    gata.catch(() => (gata = null));
  }
  return gata;
}

export async function salveazaAflatDeLa(ref: string, raspuns: string): Promise<void> {
  const r = raspuns.trim().slice(0, 120);
  if (!ref || !r) return;
  try {
    await asiguraTabel();
    await db.execute(sql`INSERT INTO "aflat_de_la" ("ref", "raspuns") VALUES (${ref}, ${r})
      ON CONFLICT ("ref") DO UPDATE SET "raspuns" = EXCLUDED."raspuns"`);
  } catch (e) {
    console.error("[aflat-de-la]", e instanceof Error ? e.message : e);
  }
}

export async function citesteAflatDeLa(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  try {
    await asiguraTabel();
    const r = await db.execute(sql`SELECT "raspuns" FROM "aflat_de_la" WHERE "ref" = ${ref} LIMIT 1`);
    const rows = ((r as unknown as { rows?: { raspuns: string }[] }).rows ?? (r as unknown as { raspuns: string }[]));
    return rows?.[0]?.raspuns ?? null;
  } catch {
    return null;
  }
}
