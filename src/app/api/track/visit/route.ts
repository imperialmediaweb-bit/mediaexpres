import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { SOURCE_COOKIE } from "@/lib/sursa";
import { ensureSursaSchema, sellingBucket } from "@/lib/sursa-db";

export const runtime = "nodejs";

const schema = z.object({
  path: z.string().min(1).max(200),
  visitorId: z.string().min(8).max(64),
});

/**
 * Numără o sosire pe o pagină care vinde.
 *
 * Sursa o citește serverul din cookie, nu o ia pe cuvânt din browser, iar o
 * revenire în aceeași zi e aruncată de indexul unic — nu de încrederea în cel
 * care sună. Numărătoarea nu are voie să strice afișarea paginii.
 */
export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const path = parsed.data.path.split("?")[0] || "/";
  if (!sellingBucket(path)) return NextResponse.json({ ok: true, counted: false });

  const source = req.cookies.get(SOURCE_COOKIE)?.value || null;

  try {
    await ensureSursaSchema();
    await db.execute(sql`
      INSERT INTO "visit" ("visitor_id", "source", "path")
      VALUES (${parsed.data.visitorId}, ${source}, ${path})
      ON CONFLICT ("visitor_id", "path", "day") DO NOTHING
    `);
  } catch (err) {
    console.error("[track/visit]", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: true, counted: false });
  }

  return NextResponse.json({ ok: true, counted: true });
}
