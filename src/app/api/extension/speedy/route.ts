import { NextRequest, NextResponse } from "next/server";
import { verifyExtensionKey } from "@/lib/extension-auth";
import { RETEA_URL } from "@/lib/retea";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 15.11.2026 — trimite adrese mediaexpress.ro la SpeedyIndex prin platforma
 * retelei (cheia SpeedyIndex sta acolo). Doar adrese de pe mediaexpress.ro.
 *   POST /api/extension/speedy  { "urls": [...] }   (x-api-key)
 */
export async function POST(req: NextRequest) {
  const neautorizat = verifyExtensionKey(req);
  if (neautorizat) return neautorizat;
  const key = process.env.RETEA_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "RETEA_KEY lipsă" }, { status: 500 });
  const b = (await req.json().catch(() => ({}))) as { urls?: unknown };
  const urls = (Array.isArray(b.urls) ? b.urls : [])
    .filter((u): u is string => typeof u === "string" && u.startsWith("https://mediaexpress.ro/"))
    .slice(0, 100);
  if (!urls.length) return NextResponse.json({ ok: false, error: "fără adrese mediaexpress.ro" }, { status: 400 });
  const res = await fetch(`${RETEA_URL}/api/admin/speedy-urls?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ urls, title: "MediaExpres pagini" }),
    signal: AbortSignal.timeout(40000),
  }).catch((e) => e as Error);
  if (res instanceof Error) return NextResponse.json({ ok: false, error: res.message }, { status: 502 });
  const j = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return NextResponse.json(j, { status: res.status });
}
