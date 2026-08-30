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
  if (!up.ok || !res.secure_url) {
    // Pastram motivul dat de Cloudinary, nu il inlocuim cu "a esuat": el e
    // singurul care distinge o cheie gresita de o limita de cont atinsa, iar
    // fara el am cautat orbeste de ce niciun client nu reuseste sa urce poze.
    const motiv = res?.error?.message ? ` (${res.error.message})` : "";
    throw new Error(`Încărcarea a eșuat${motiv}`);
  }
  return { url: res.secure_url, name: file.name };
}

/**
 * Anunta serverul ca unei incarcari i-a esuat.
 *
 * Best-effort si tacut: daca nici baliza nu pleaca, clientul nu trebuie sa
 * afle — el are deja un mesaj de eroare pe ecran. Rostul ei e sa aflam NOI,
 * in aceeasi clipa, nu peste trei clienti.
 */
export function reportUploadError(
  where: string,
  message: string,
  file?: { name: string; size: number; type: string },
): void {
  try {
    void fetch("/api/upload-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        where,
        message: message.slice(0, 500),
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type,
      }),
    }).catch(() => {});
  } catch {
    /* niciodata nu stricam fluxul clientului pentru o baliza */
  }
}

/** Ce ii spunem clientului cand incarcarea nu merge: o cale care functioneaza. */
export const UPLOAD_FALLBACK_HINT =
  "Dacă pozele tot nu se încarcă, trimite-le pe WhatsApp la +40 758 169 388 sau răspunde la emailul de confirmare — le adăugăm noi la articol. Comanda nu se blochează din cauza pozelor.";
