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
      db.execute(
        sql`ALTER TABLE "publication_report" ADD COLUMN IF NOT EXISTS "report_url" text`,
      ),
      db.execute(sql`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "source" text`),
      db.execute(sql`ALTER TABLE "order_submission" ADD COLUMN IF NOT EXISTS "source" text`),
      db.execute(
        sql`ALTER TABLE "order_submission" ADD COLUMN IF NOT EXISTS "ritm" text NOT NULL DEFAULT 'rapid'`,
      ),
      db.execute(sql`ALTER TABLE "order_submission" ADD COLUMN IF NOT EXISTS "link_notes" text`),
      db.execute(
        sql`ALTER TABLE "publisher"
          ADD COLUMN IF NOT EXISTS "analytics_proof_url" text,
          ADD COLUMN IF NOT EXISTS "facebook_followers" integer,
          ADD COLUMN IF NOT EXISTS "dofollow_links" boolean,
          ADD COLUMN IF NOT EXISTS "tier" text,
          ADD COLUMN IF NOT EXISTS "price_per_article" integer,
          ADD COLUMN IF NOT EXISTS "declaration_accepted" boolean NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0`,
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
 * Tabela plasarilor pe publicatii partenere.
 *
 * 14.09.2026 — pagina publica /plasare/[token] e deschisa de partener direct
 * din email, posibil inainte ca proprietarul sa fi rulat /api/admin/fix-db.
 * Daca tabela lipseste atunci, primul partener din viata firmei vede o
 * eroare. De aceea se creeaza si de aici, o singura data pe proces.
 */
let placementsDone: Promise<void> | null = null;

export function ensurePlacementTables(): Promise<void> {
  if (!placementsDone) {
    placementsDone = db
      .execute(
        sql`CREATE TABLE IF NOT EXISTS "placement" (
          "id" text PRIMARY KEY NOT NULL,
          "publisher_id" text NOT NULL,
          "order_submission_id" text,
          "client_label" text,
          "token_version" integer NOT NULL DEFAULT 0,
          "article_title" text NOT NULL,
          "article_body" text NOT NULL,
          "images" text NOT NULL DEFAULT '[]',
          "featured_index" integer NOT NULL DEFAULT 0,
          "link_notes" text,
          "tier" text,
          "price_partner" integer NOT NULL,
          "price_client" integer NOT NULL,
          "status" text NOT NULL DEFAULT 'trimis',
          "refusal_reason" text,
          "published_url" text,
          "sent_at" timestamp DEFAULT now() NOT NULL,
          "deadline_refuz" timestamp NOT NULL,
          "deadline_publicare" timestamp NOT NULL,
          "accepted_at" timestamp,
          "refused_at" timestamp,
          "published_at" timestamp,
          "online_until" timestamp,
          "expired_at" timestamp,
          "link_status" text,
          "link_checked_at" timestamp,
          "dofollow_expected" boolean NOT NULL DEFAULT true,
          "statement_id" text,
          "admin_notes" text,
          "created_at" timestamp DEFAULT now() NOT NULL
        )`,
      )
      .then(() => undefined)
      .catch((e) => {
        placementsDone = null;
        console.error("[ensure-columns] placement", e);
      });
  }
  return placementsDone;
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
