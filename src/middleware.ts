import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "me_admin_session";

function verifyToken(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString();
  } catch {
    return false;
  }
  // Edge runtime: use Web Crypto
  // Note: In middleware we only do a shallow check here, the full HMAC verify
  // happens in the server component using Node crypto.
  const [username, expiresStr] = payload.split(".");
  if (!username || !expiresStr) return false;
  const expires = parseInt(expiresStr, 10);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  // We return true here for shallow check; full HMAC verify runs in /admin pages.
  return true;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /admin/* except /admin/login
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const secret = process.env.SESSION_SECRET || "dev-secret";
    if (!verifyToken(token, secret)) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
