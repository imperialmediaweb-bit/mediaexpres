/**
 * Incarcare de fisiere din browser, semnata de server.
 *
 * Extras din TransferForm ca sa nu existe doua copii: formularul de pe
 * /comanda/transfer si comanda din chat incarca aceleasi tipuri de fisiere
 * (poze pentru articol, dovada platii) prin acelasi endpoint semnat. Cand se
 * schimba limita sau folderul, se schimba intr-un singur loc.
 */

export interface Uploaded {
  url: string;
  name: string;
}

/** Cloudinary refuza oricum fisierele mari; taiem devreme, cu mesaj in romana. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function signAndUpload(file: File): Promise<Uploaded> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`„${file.name}" depășește 8MB.`);
  }

  const signRes = await fetch("/api/comanda/transfer/upload-sign", { method: "POST" });
  const sign = await signRes.json();
  if (!signRes.ok || !sign.ok) {
    throw new Error(sign.error || "Nu am putut pregăti încărcarea");
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sign.apiKey);
  fd.append("timestamp", String(sign.timestamp));
  fd.append("signature", sign.signature);
  if (sign.folder) fd.append("folder", sign.folder);

  // `auto`, nu `image`: dovada platii vine des ca PDF, nu ca poza.
  const up = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`, {
    method: "POST",
    body: fd,
  });
  const res = await up.json();
  if (!up.ok || !res.secure_url) throw new Error("Încărcarea a eșuat");
  return { url: res.secure_url, name: file.name };
}
