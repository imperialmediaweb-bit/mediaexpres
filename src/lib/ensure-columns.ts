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
    done = db
      .execute(sql`ALTER TABLE "order_submission" ADD COLUMN IF NOT EXISTS "fb_boost_paper" text`)
      .then(() => undefined)
      .catch((e) => {
        done = null;
        console.error("[ensure-columns]", e);
      });
  }
  return done;
}
