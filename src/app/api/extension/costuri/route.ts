import { NextRequest, NextResponse } from "next/server";
import { verifyExtensionKey } from "@/lib/extension-auth";
import { RETEA_URL } from "@/lib/retea";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * 15.11.2026 — costurile lunii (AI pe furnizor + creditele Cloudinary), doar citire, din
 * alarma de costuri a retelei (proba=1: fara e-mail). Cerut de proprietar dupa factura Cloudinary.
 *   GET /api/extension/costuri   (x-api-key)
 */
export async function GET(req: NextRequest) {
  const neautorizat = verifyExtensionKey(req);
  if (neautorizat) return neautorizat;
  const key = process.env.RETEA_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "RETEA_KEY lipsă" });
  const res = await fetch(`${RETEA_URL}/api/cron/alarma-costuri?proba=1&key=${encodeURIComponent(key)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(100000),
  }).catch((e) => e as Error);
  if (res instanceof Error) return NextResponse.json({ ok: false, error: res.message });
  const j = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return NextResponse.json({ ...j, http_retea: res.status });
}
