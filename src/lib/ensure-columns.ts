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
