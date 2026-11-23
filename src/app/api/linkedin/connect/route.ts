import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { urlConectare } from "@/lib/linkedin";
import { SITE } from "@/data/site";

export const dynamic = "force-dynamic";

/** Adminul logat apasa aici o data: LinkedIn cere voie, apoi revine la /api/linkedin/callback. */
export async function GET() {
  if (!getSession()) return NextResponse.redirect(`${SITE.url}/admin/login?from=/api/linkedin/connect`);
  const state = crypto.randomUUID();
  const url = urlConectare(state);
  if (!url) return NextResponse.json({ ok: false, error: "LINKEDIN_CLIENT_ID lipseste pe server" }, { status: 500 });
  const res = NextResponse.redirect(url);
  res.cookies.set("li_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
