import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePressRelease } from "@/lib/ai";

export const runtime = "nodejs";

const schema = z.object({
  companyName: z.string().min(2).max(150),
  announcement: z.string().min(10).max(1500),
  type: z.enum([
    "lansare",
    "eveniment",
    "parteneriat",
    "rezultate",
    "extindere",
    "premii",
    "altceva",
  ]),
  contactName: z.string().max(150).optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
});

// Per-IP rate limit: 5/hour (lead-magnet gratuit, dar protejat).
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
      {
        ok: false,
        error:
          "Ai folosit toate cele 5 generari gratuite din aceasta ora. Incearca peste 1 ora sau fa-ti cont.",
      },
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
    const out = await generatePressRelease({
      companyName: parsed.data.companyName,
      announcement: parsed.data.announcement,
      type: parsed.data.type,
      contactName: parsed.data.contactName || undefined,
      contactEmail: parsed.data.contactEmail || undefined,
      city: parsed.data.city || undefined,
    });
    return NextResponse.json({ ok: true, ...out });
  } catch (e: unknown) {
    console.error("[generate-public] error", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Eroare la generare" },
      { status: 500 }
    );
  }
}
