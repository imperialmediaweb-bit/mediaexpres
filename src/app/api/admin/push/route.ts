import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cheiVapid, salveazaAbonament, trimitePushAdmin } from "@/lib/admin-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 24.11.2026 — notificari push pe telefonul adminului. GET = cheia publica; POST = abonare (+ notificare de proba). */
export async function GET() {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  const v = await cheiVapid();
  return NextResponse.json({ ok: true, publicKey: v.publicKey });
}

export async function POST(req: NextRequest) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ ok: false, error: "Abonament invalid" }, { status: 400 });
  }
  await salveazaAbonament({ endpoint: body.endpoint, keys: { p256dh: body.keys.p256dh, auth: body.keys.auth } });
  const n = await trimitePushAdmin("Notificări pornite ✅", "Aici primești mesajele noi din chatul site-ului.", "/admin/chat");
  return NextResponse.json({ ok: true, trimise: n });
}
