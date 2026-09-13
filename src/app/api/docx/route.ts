import { NextRequest, NextResponse } from "next/server";
import { citesteDocx, linkuriCaNote } from "@/lib/docx";
import { getCloudinaryConfig, signUploadParams } from "@/lib/cloudinary";
import { verifyOrderToken } from "@/lib/order-token";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-client";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Un .docx cu trei poze de telefon trece usor de 10MB. */
const MAX_DOCX_BYTES = 30 * 1024 * 1024;
const MAX_IMAGES = 3;

/**
 * Clientul urca documentul Word asa cum l-a scris — cu poze si cu linkuri pe
 * cuvinte — iar noi scoatem textul, urcam pozele pe Cloudinary si scriem
 * linkurile ca „ancoră → adresă". Vezi lib/docx.ts pentru motiv.
 *
 * Fara autentificare: e pe formularele publice de comanda, la fel ca
 * semnarea upload-ului. Tokenul de comanda, cand exista, alege doar
 * folderul din Cloudinary (pozele raman grupate pe comanda).
 */
export async function POST(req: NextRequest) {
  const cfg = getCloudinaryConfig();
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Nu am primit fișierul." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Nu am primit fișierul." }, { status: 400 });
  }
  if (!/\.docx$/i.test(file.name)) {
    return NextResponse.json(
      { ok: false, error: "Încarcă un document Word în format .docx (Word 2007 sau mai nou). Un .doc vechi se salvează din Word ca .docx." },
      { status: 400 },
    );
  }
  if (file.size > MAX_DOCX_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Documentul are ${(file.size / 1024 / 1024).toFixed(0)}MB, peste limita de 30MB. Scoate pozele mari din el și urcă-le separat.` },
      { status: 400 },
    );
  }

  let continut;
  try {
    continut = citesteDocx(await file.arrayBuffer());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Nu am putut citi documentul." },
      { status: 400 },
    );
  }

  const tokenRaw = form.get("token");
  const order = typeof tokenRaw === "string" && tokenRaw ? verifyOrderToken(tokenRaw) : null;

  const images: { url: string; publicId: string; name: string }[] = [];
  let pozePreaMari = 0;
  let pozeNeurcate = 0;
  if (cfg && continut.images.length) {
    const folder = order
      ? `${cfg.uploadFolder}/comenzi/${order.sessionId}`
      : `${cfg.uploadFolder}/op`;
    for (const img of continut.images) {
      if (images.length >= MAX_IMAGES) break;
      if (img.data.byteLength > MAX_UPLOAD_BYTES) {
        pozePreaMari++;
        continue;
      }
      const timestamp = Math.floor(Date.now() / 1000);
      const signed = signUploadParams({ timestamp, folder });
      if (!signed) break;
      const fd = new FormData();
      // Copie intr-un ArrayBuffer propriu: tipurile Blob nu accepta un
      // Uint8Array care ar putea sta pe un SharedArrayBuffer.
      const copie = new Uint8Array(img.data.byteLength);
      copie.set(img.data);
      fd.append("file", new Blob([copie.buffer], { type: img.mime }), img.name);
      fd.append("api_key", signed.api_key);
      fd.append("timestamp", String(timestamp));
      fd.append("folder", folder);
      fd.append("signature", signed.signature);
      try {
        const up = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, {
          method: "POST",
          body: fd,
          signal: AbortSignal.timeout(25000),
        });
        const j = (await up.json()) as { secure_url?: string; public_id?: string; error?: { message?: string } };
        if (up.ok && j.secure_url) {
          images.push({ url: j.secure_url, publicId: j.public_id || "", name: img.name });
        } else {
          pozeNeurcate++;
          console.error("[docx] cloudinary:", j.error?.message);
        }
      } catch (e) {
        pozeNeurcate++;
        console.error("[docx] cloudinary:", e);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    title: continut.title,
    body: continut.body,
    linkNotes: linkuriCaNote(continut.links),
    images,
    pozeInDocument: continut.images.length,
    pozePreaMari,
    pozeNeurcate,
  });
}
