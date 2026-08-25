import { NextRequest, NextResponse } from "next/server";
import { signUploadParams, getCloudinaryConfig } from "@/lib/cloudinary";

export const runtime = "nodejs";

// Clientul care plateste prin OP nu are nici cont, nici token de comanda — deci
// endpointul e public si singura aparare e limitarea pe IP. 20 de fisiere pe
// minut acopera lejer o comanda reala (3 poze + dovada) si opreste abuzul.
const RATE_LIMIT_MAX = 20;
const WINDOW_MS = 60_000;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);
  // Curatam intrarile vechi ca Map-ul sa nu creasca la nesfarsit.
  if (requestLog.size > 5000) {
    for (const [k, v] of requestLog) {
      if (v.every((t) => now - t >= WINDOW_MS)) requestLog.delete(k);
    }
  }
  return recent.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Prea multe încărcări. Încearcă din nou în câteva minute." },
      { status: 429 },
    );
  }

  const cfg = getCloudinaryConfig();
  if (!cfg) {
    return NextResponse.json(
      { ok: false, error: "Încărcarea de fișiere nu este configurată" },
      { status: 503 },
    );
  }

  const folder = `${cfg.uploadFolder}/op`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = signUploadParams({ timestamp, folder });
  if (!signed) {
    return NextResponse.json(
      { ok: false, error: "Încărcarea de fișiere nu este configurată" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    timestamp,
    folder,
    signature: signed.signature,
  });
}
