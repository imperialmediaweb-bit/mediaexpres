import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyExtensionKey } from "@/lib/extension-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 23.11.2026 — voce ElevenLabs pentru clipurile de reclama, din admin.
 * Cheia ramane pe server (ELEVENLABS_API_KEY). Body: { text, voice?, model? }.
 * Raspuns: { ok, model, audio: <mp3 base64> }.
 */
export async function POST(req: NextRequest) {
  if (!getSession() && verifyExtensionKey(req)) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "ELEVENLABS_API_KEY lipseste" }, { status: 500 });
  const body = (await req.json().catch(() => ({}))) as { text?: string; voice?: string; model?: string };
  const text = String(body.text || "").trim().slice(0, 2500);
  if (text.length < 3) return NextResponse.json({ ok: false, error: "Lipseste textul" }, { status: 400 });
  const voice = String(body.voice || process.env.ELEVENLABS_VOICE_ID || "nPczCjzI2devNBz1zQrb").replace(/[^A-Za-z0-9]/g, "");
  const erori: string[] = [];
  for (const model of [body.model || process.env.ELEVENLABS_MODEL || "eleven_v4", "eleven_multilingual_v2"]) {
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "content-type": "application/json", "xi-api-key": key },
        body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3 } }),
        signal: AbortSignal.timeout(100_000),
      });
      if (!r.ok) {
        erori.push(`${model}: ${r.status} ${(await r.text()).slice(0, 160)}`);
        continue;
      }
      const audio = Buffer.from(await r.arrayBuffer()).toString("base64");
      return NextResponse.json({ ok: true, model, audio });
    } catch (e) {
      erori.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return NextResponse.json({ ok: false, error: erori.join(" | ") }, { status: 502 });
}
