import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

// Autentificare pentru extensia Chrome LinkedIn.
// Extensia nu poate citi cookie-ul httpOnly de admin, deci foloseste un secret
// pre-partajat (env EXTENSION_API_KEY) trimis in header-ul X-Api-Key.

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
  "Access-Control-Max-Age": "86400",
};

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Returneaza null daca cheia e valida, sau un NextResponse de eroare altfel.
export function verifyExtensionKey(req: NextRequest): NextResponse | null {
  const expected = process.env.EXTENSION_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "EXTENSION_API_KEY nu e configurat pe server" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
  const provided = req.headers.get("x-api-key") || "";
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json(
      { ok: false, error: "Cheie API invalida" },
      { status: 401, headers: CORS_HEADERS },
    );
  }
  return null;
}

// Raspuns standard pentru preflight OPTIONS.
export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
