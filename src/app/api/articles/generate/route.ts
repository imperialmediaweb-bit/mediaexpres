import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getEntitlements } from "@/lib/entitlements";
import { generateArticle } from "@/lib/ai";

export const runtime = "nodejs";

const generateSchema = z.object({
  topic: z.string().min(3).max(300),
  keyPoints: z.string().max(2000).optional().or(z.literal("")),
  audience: z.string().max(300).optional().or(z.literal("")),
  tone: z.enum(["neutru", "promotional", "informativ"]).optional(),
  category: z.enum(["standard", "casino"]).optional(),
});

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const requestLog = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(userId) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(userId, recent);
  return recent.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  const ent = await getEntitlements(session.user.id);
  if (!ent.hasPaid) {
    return NextResponse.json(
      { ok: false, error: "Generarea AI este disponibila doar dupa prima plata." },
      { status: 403 }
    );
  }

  if (isRateLimited(session.user.id)) {
    return NextResponse.json(
      { ok: false, error: "Prea multe cereri. Incearca in 1 minut." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0]?.message || "Date invalide" },
      { status: 400 }
    );
  }

  try {
    const out = await generateArticle({
      topic: parsed.data.topic,
      keyPoints: parsed.data.keyPoints || undefined,
      audience: parsed.data.audience || undefined,
      tone: parsed.data.tone,
      category: parsed.data.category,
    });
    return NextResponse.json({ ok: true, ...out });
  } catch (e: unknown) {
    console.error("[articles/generate] error", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Eroare la generare" },
      { status: 500 }
    );
  }
}
