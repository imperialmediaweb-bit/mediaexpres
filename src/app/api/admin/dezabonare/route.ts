import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dezaboneaza } from "@/lib/dezabonare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Adminul dezaboneaza de mana o adresa (ex. cine raspunde „STOP"): POST ?email=... */
export async function POST(req: NextRequest) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  const email = (req.nextUrl.searchParams.get("email") || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: false, error: "Email invalid" }, { status: 400 });
  const r = await dezaboneaza(email);
  return NextResponse.json({ ok: true, email, emailuri_programate_anulate: r.anulate });
}

/** La fel, din browser (adminul logat deschide linkul): GET ?email=... */
export const GET = POST;
