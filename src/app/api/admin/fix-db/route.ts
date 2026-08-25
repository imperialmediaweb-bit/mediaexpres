import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "nodejs";

// Endpoint one-shot pentru fix-uri de schema pe productie cand sandbox-ul de
// dezvoltare nu poate ajunge la baza de date. Protejat cu EXTENSION_API_KEY.
//
// Apel: curl -X POST https://mediaexpress.ro/api/admin/fix-db -H "x-api-key: <EXTENSION_API_KEY>"
//
// POST cu cheia in header, nu GET cu cheia in query — URL-urile ajung in
// loguri de proxy/browser si ar scurge cheia care protejeaza si /api/extension/*.
// Operatiile sunt idempotente — pot fi rulate de mai multe ori fara probleme.

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  const expected = process.env.EXTENSION_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "EXTENSION_API_KEY nu e setat pe server" },
      { status: 500 },
    );
  }
  const provided = req.headers.get("x-api-key") || "";
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ ok: false, error: "key invalid" }, { status: 401 });
  }

  const results: { step: string; status: string }[] = [];

  // Fix 1: email pe prospect trebuie sa fie nullable (LinkedIn fara email).
  try {
    await db.execute(
      sql`ALTER TABLE "prospect" ALTER COLUMN "email" DROP NOT NULL`,
    );
    results.push({ step: "prospect.email -> nullable", status: "OK" });
  } catch (e) {
    results.push({
      step: "prospect.email -> nullable",
      status: e instanceof Error ? e.message : String(e),
    });
  }

  // Fix 2: index unic pe order.stripe_session_id — plasa de siguranta pentru
  // idempotenta webhookului Stripe (doua livrari concurente nu pot insera ambele).
  try {
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "order_stripe_session_id_unique" ON "order" ("stripe_session_id")`,
    );
    results.push({ step: "order.stripe_session_id -> unique index", status: "OK" });
  } catch (e) {
    results.push({
      step: "order.stripe_session_id -> unique index",
      status: e instanceof Error ? e.message : String(e),
    });
  }

  // Fix 3: o plata = o singura trimitere de materiale. Fara indexul asta,
  // tokenul de acces (valabil 90 de zile) permitea publicari gratuite repetate.
  try {
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "order_submission_stripe_session_id_unique" ON "order_submission" ("stripe_session_id")`,
    );
    results.push({ step: "order_submission.stripe_session_id -> unique index", status: "OK" });
  } catch (e) {
    results.push({
      step: "order_submission.stripe_session_id -> unique index",
      status: e instanceof Error ? e.message : String(e),
    });
  }

  // Fix 4: tabelele si coloanele adaugate dupa ce s-a descoperit ca
  // `drizzle-kit push` NU rula la pornire — railway.json suprascria comanda de
  // start din nixpacks.toml cu `npm run start`, fara push. Migrarile de mai jos
  // sunt idempotente (IF NOT EXISTS), deci ruleaza fara grija de cate ori vrei.
  const migrations: { step: string; query: ReturnType<typeof sql> }[] = [
    {
      step: "order_submission: coloane pentru plata prin OP",
      query: sql`
        ALTER TABLE "order_submission"
          ADD COLUMN IF NOT EXISTS "payment_method" text NOT NULL DEFAULT 'card',
          ADD COLUMN IF NOT EXISTS "payment_proof" text,
          ADD COLUMN IF NOT EXISTS "company_cui" text,
          ADD COLUMN IF NOT EXISTS "company_address" text,
          ADD COLUMN IF NOT EXISTS "unique_per_site" boolean NOT NULL DEFAULT true
      `,
    },
    {
      step: "tabel client_message (mesajele din contul clientului)",
      query: sql`
        CREATE TABLE IF NOT EXISTS "client_message" (
          "id" text PRIMARY KEY NOT NULL,
          "email" text NOT NULL,
          "from_client" boolean NOT NULL DEFAULT true,
          "body" text NOT NULL,
          "attachments" text NOT NULL DEFAULT '[]',
          "handled" boolean NOT NULL DEFAULT false,
          "created_at" timestamp DEFAULT now() NOT NULL
        )
      `,
    },
    {
      step: "index pe client_message.email",
      query: sql`CREATE INDEX IF NOT EXISTS "client_message_email_idx" ON "client_message" ("email")`,
    },
    {
      step: "tabel promo_announcement (anuntul de prelungire)",
      query: sql`
        CREATE TABLE IF NOT EXISTS "promo_announcement" (
          "id" text PRIMARY KEY NOT NULL,
          "deadline_label" text NOT NULL UNIQUE,
          "sent_count" integer NOT NULL DEFAULT 0,
          "created_at" timestamp DEFAULT now() NOT NULL
        )
      `,
    },
    {
      step: "tabel publication_report (rapoartele clientilor)",
      query: sql`
        CREATE TABLE IF NOT EXISTS "publication_report" (
          "id" text PRIMARY KEY NOT NULL,
          "email" text NOT NULL,
          "client_name" text,
          "article_title" text,
          "links" text NOT NULL DEFAULT '[]',
          "created_at" timestamp DEFAULT now() NOT NULL
        )
      `,
    },
    {
      step: "tabel order_submission (materialele trimise de clienti)",
      query: sql`
        CREATE TABLE IF NOT EXISTS "order_submission" (
          "id" text PRIMARY KEY NOT NULL,
          "stripe_session_id" text NOT NULL UNIQUE,
          "email" text NOT NULL,
          "package_id" text NOT NULL,
          "title" text NOT NULL,
          "body" text NOT NULL,
          "meta_description" text,
          "keywords" text,
          "company_name" text,
          "site_url" text,
          "contact_phone" text,
          "images" text NOT NULL DEFAULT '[]',
          "featured_index" integer NOT NULL DEFAULT 0,
          "facebook_opt_in" boolean NOT NULL DEFAULT true,
          "unique_per_site" boolean NOT NULL DEFAULT true,
          "generated_by_ai" boolean NOT NULL DEFAULT false,
          "is_casino" boolean NOT NULL DEFAULT false,
          "payment_method" text NOT NULL DEFAULT 'card',
          "payment_proof" text,
          "company_cui" text,
          "company_address" text,
          "status" text NOT NULL DEFAULT 'pending',
          "created_at" timestamp DEFAULT now() NOT NULL,
          "published_at" timestamp
        )
      `,
    },
  ];

  // Tabelele se creeaza INAINTE de coloanele adaugate pe ele.
  for (const m of [...migrations].reverse()) {
    try {
      await db.execute(m.query);
      results.push({ step: m.step, status: "OK" });
    } catch (e) {
      results.push({ step: m.step, status: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ ok: true, results });
}
