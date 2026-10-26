import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Coloanele pentru sursa clientului și tabelul de vizite.
 *
 * Create aici, nu prin pasul de migrare: pe Media Chief `drizzle-kit push` s-a
 * oprit la o întrebare pe care nimeni nu avea cum s-o răspundă într-un
 * container fără tastatură, iar site-ul a stat picat. ADD COLUMN IF NOT EXISTS
 * e idempotent, rulează unde e nevoie și nu poate ține pornirea ostatică.
 */
let ensured = false;

export async function ensureSursaSchema(): Promise<void> {
  if (ensured) return;

  await db.execute(sql`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "source" text`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "visit" (
      "id"         serial PRIMARY KEY,
      "visitor_id" text NOT NULL,
      "source"     text,
      "path"       text NOT NULL,
      "day"        date NOT NULL DEFAULT CURRENT_DATE,
      "created_at" timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "visit_once_per_day"
      ON "visit" ("visitor_id", "path", "day")
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "visit_source" ON "visit" ("source")`);

  ensured = true;
}

/** Paginile unde i se cere omului să cumpere. Restul nu se numără. */
export function sellingBucket(path: string): "oferta" | "comanda" | null {
  if (path.startsWith("/comanda")) return "comanda";
  if (path.startsWith("/oferta") || path.startsWith("/pachete")) return "oferta";
  return null;
}
