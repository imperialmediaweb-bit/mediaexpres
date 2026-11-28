import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyExtensionKey } from "@/lib/extension-auth";
import { rezumatFunnel } from "@/lib/funnel-comanda";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 28.11.2026 — unde se opresc oamenii in formularul de comanda. ?zile=7 */
export async function GET(req: NextRequest) {
  if (!getSession() && verifyExtensionKey(req)) return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  const zile = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("zile")) || 7));
  return NextResponse.json({ ok: true, ...(await rezumatFunnel(zile)) });
}
