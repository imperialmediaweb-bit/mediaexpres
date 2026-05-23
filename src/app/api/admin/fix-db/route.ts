import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "nodejs";

// Endpoint one-shot pentru fix-uri de schema pe productie cand sandbox-ul de
// dezvoltare nu poate ajunge la baza de date. Protejat cu EXTENSION_API_KEY.
//
// Apel: GET /api/admin/fix-db?key=<EXTENSION_API_KEY>
//
// Operatiile sunt idempotente — pot fi rulate de mai multe ori fara probleme.

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function GET(req: NextRequest) {
  const expected = process.env.EXTENSION_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "EXTENSION_API_KEY nu e setat pe server" },
      { status: 500 },
    );
  }
  const provided = req.nextUrl.searchParams.get("key") || "";
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

  return NextResponse.json({ ok: true, results });
}
