import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOrderToken } from "@/lib/order-token";
import { signUploadParams, getCloudinaryConfig } from "@/lib/cloudinary";

export const runtime = "nodejs";

const schema = z.object({ token: z.string().min(10) });

/**
 * Semneaza un upload Cloudinary pentru clientul care tocmai a platit.
 * Difera de /api/upload/sign prin autorizare: acolo e sesiune de cont,
 * aici e tokenul de comanda (clientul nu are cont).
 */
export async function POST(req: NextRequest) {
  const cfg = getCloudinaryConfig();
  if (!cfg) {
    return NextResponse.json(
      { ok: false, error: "Upload-ul de imagini nu este configurat" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  }

  const order = verifyOrderToken(parsed.data.token);
  if (!order) {
    return NextResponse.json(
      { ok: false, error: "Link expirat sau invalid" },
      { status: 403 },
    );
  }

  // Un folder per comanda — pozele raman grupate si usor de gasit.
  const folder = `${cfg.uploadFolder}/comenzi/${order.sessionId}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = signUploadParams({ timestamp, folder });
  if (!signed) {
    return NextResponse.json(
      { ok: false, error: "Upload-ul de imagini nu este configurat" },
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
