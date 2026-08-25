import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { signUploadParams, getCloudinaryConfig } from "@/lib/cloudinary";

export const runtime = "nodejs";

/**
 * Semneaza un upload Cloudinary pentru un client logat, fara sa fie legat de
 * un articol anume — folosit la fisierele atasate mesajelor din cont.
 * /api/upload/sign cere un articleId detinut de user, /api/articol/upload-sign
 * cere token de comanda; aici e nevoie doar de sesiune.
 */
export async function POST() {
  const cfg = getCloudinaryConfig();
  if (!cfg) {
    return NextResponse.json(
      { ok: false, error: "Încărcarea de fișiere nu este configurată" },
      { status: 503 },
    );
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  }

  const folder = `${cfg.uploadFolder}/mesaje/u_${userId}`;
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
