import { NextRequest, NextResponse } from "next/server";
import { verifyExtensionKey } from "@/lib/extension-auth";
import { getSession } from "@/lib/auth";
import { urcaPozaOferta } from "@/lib/oferta-facebook";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * 23.11.2026 — imagine generata cu OpenAI (cel mai nou model de imagine) pentru
 * reclame si thumbnailuri, din admin. Cheia ramane pe server; raspunsul e doar
 * adresa pozei copiate in Cloudinary. Body: { prompt, size? }.
 */
export async function POST(req: NextRequest) {
  // Adminul logat sau cheia extensiei (aceeasi ca la /api/extension/*).
  if (!getSession() && verifyExtensionKey(req)) return NextResponse.json({ ok: false, error: "Neautorizat" }, { status: 401 });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "OPENAI_API_KEY lipseste" }, { status: 500 });
  const body = (await req.json().catch(() => ({}))) as { prompt?: string; size?: string };
  const prompt = String(body.prompt || "").trim().slice(0, 4000);
  if (prompt.length < 10) return NextResponse.json({ ok: false, error: "Lipseste promptul" }, { status: 400 });
  const size = ["1024x1024", "1024x1536", "1536x1024"].includes(String(body.size)) ? String(body.size) : "1024x1536";
  const erori: string[] = [];
  for (const model of [process.env.OPENAI_IMAGE_MODEL || "gpt-image-2", "gpt-image-1.5", "gpt-image-1"]) {
    try {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, prompt, size, n: 1, quality: "high" }),
        signal: AbortSignal.timeout(150_000),
      });
      if (!r.ok) {
        erori.push(`${model}: ${r.status} ${(await r.text()).slice(0, 160)}`);
        continue;
      }
      const j = (await r.json()) as { data?: { b64_json?: string; url?: string }[] };
      const d = j.data?.[0];
      let bytes: Buffer | null = null;
      if (d?.b64_json) bytes = Buffer.from(d.b64_json, "base64");
      else if (d?.url) bytes = Buffer.from(await (await fetch(d.url)).arrayBuffer());
      if (!bytes) {
        erori.push(`${model}: fara imagine`);
        continue;
      }
      const url = await urcaPozaOferta(bytes, "image/png");
      if (!url) return NextResponse.json({ ok: false, error: "Cloudinary a refuzat" }, { status: 502 });
      return NextResponse.json({ ok: true, model, url });
    } catch (e) {
      erori.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return NextResponse.json({ ok: false, error: erori.join(" | ") }, { status: 502 });
}
