import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditCompanyNews } from "@/lib/news-audit";

export const runtime = "nodejs";

const schema = z.object({
  companyName: z.string().min(2).max(150),
});

const RATE_LIMIT_MAX = 5;
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
      { ok: false, error: "Prea multe verificari. Incearca peste o ora." },
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
    const audit = await auditCompanyNews(parsed.data.companyName);
    return NextResponse.json({ ok: true, audit });
  } catch (e: unknown) {
    console.error("[audit-mentiuni] error", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Eroare la audit" },
      { status: 500 }
    );
  }
}
