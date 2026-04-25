import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateTitleVariants } from "@/lib/ai";

export const runtime = "nodejs";

const schema = z.object({
  topic: z.string().min(5).max(300),
});

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Ai folosit toate cele 10 generari din aceasta ora." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 }
    );
  }

  try {
    const variants = await generateTitleVariants(parsed.data.topic);
    return NextResponse.json({ ok: true, variants });
  } catch (e: unknown) {
    console.error("[generate-titles] error", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Eroare la generare" },
      { status: 500 }
    );
  }
}
