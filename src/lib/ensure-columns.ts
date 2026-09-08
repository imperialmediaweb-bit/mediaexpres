import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Coloanele noi de pe comenzi se adauga in productie prin /api/admin/fix-db,
 * apelat de proprietar dupa deploy. Intre deploy si apel, orice INSERT cu
 * coloana noua ar cadea — adica exact comenzile pe care le asteptam. Plasa
 * de siguranta: acelasi ALTER idempotent, rulat o singura data pe proces,
 * inaintea primului insert. Costa un roundtrip la prima comanda, apoi nimic.
 */
let done: Promise<void> | null = null;

export function ensureOrderColumns(): Promise<void> {
  if (!done) {
    done = Promise.all([
      db.execute(sql`ALTER TABLE "order_submission" ADD COLUMN IF NOT EXISTS "fb_boost_paper" text`),
      db.execute(
        sql`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "material_reminder_at" timestamp, ADD COLUMN IF NOT EXISTS "material_alert_at" timestamp`,
      ),
      db.execute(
        sql`ALTER TABLE "order_submission" ADD COLUMN IF NOT EXISTS "payment_reminders_sent" integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS "payment_reminder_at" timestamp`,
      ),
    ])
      .then(() => undefined)
      .catch((e) => {
        done = null;
        console.error("[ensure-columns]", e);
      });
  }
  return done;
}

/**
 * Acelasi motiv, pentru tabelul de recenzii: pagina /recenzie/[token] e
 * publica si clientul o deschide din emailul cu raportul, posibil inainte ca
 * proprietarul sa fi apelat fix-db. Fara plasa asta, prima recenzie s-ar
 * pierde — exact aia care conteaza, de la primul client multumit.
 */
let reviewsDone: Promise<void> | null = null;

export function ensureReviewsTable(): Promise<void> {
  if (!reviewsDone) {
    reviewsDone = db
      .execute(
        sql`CREATE TABLE IF NOT EXISTS "review" (
          "id" text PRIMARY KEY NOT NULL,
          "email" text NOT NULL,
          "display_name" text NOT NULL,
          "rating" integer NOT NULL DEFAULT 5,
          "quote" text NOT NULL,
          "site_url" text,
          "consent_public" boolean NOT NULL DEFAULT false,
          "source" text NOT NULL DEFAULT 'form',
          "created_at" timestamp DEFAULT now() NOT NULL
        )`,
      )
      .then(() => undefined)
      .catch((e) => {
        reviewsDone = null;
        console.error("[ensure-columns] review", e);
      });
  }
  return reviewsDone;
}
