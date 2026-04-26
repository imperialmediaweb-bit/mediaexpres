import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getEntitlements } from "@/lib/entitlements";
import { generateEditorialCalendar } from "@/lib/ai";

export const runtime = "nodejs";

const schema = z.object({
  industry: z.string().min(2).max(150),
  companyContext: z.string().max(1000).optional().or(z.literal("")),
});

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const requestLog = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(userId) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
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
      { ok: false, error: "Calendarul editorial e disponibil dupa prima plata." },
      { status: 403 }
    );
  }

  if (isRateLimited(session.user.id)) {
    return NextResponse.json(
      { ok: false, error: "Prea multe cereri. Incearca peste o ora." },
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
    const calendar = await generateEditorialCalendar(
      parsed.data.industry,
      parsed.data.companyContext || ""
    );
    return NextResponse.json({ ok: true, calendar });
  } catch (e: unknown) {
    console.error("[generate-calendar] error", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Eroare la generare" },
      { status: 500 }
    );
  }
}
