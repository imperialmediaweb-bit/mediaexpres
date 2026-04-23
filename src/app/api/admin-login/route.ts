import { NextRequest, NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/validators";
import {
  checkAdminCredentials,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Credențiale invalide" }, { status: 400 });
  }
  const { username, password } = parsed.data;
  if (!checkAdminCredentials(username, password)) {
    return NextResponse.json({ ok: false, error: "Utilizator sau parolă greșite" }, { status: 401 });
  }
  const token = createSessionToken(username);
  setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
