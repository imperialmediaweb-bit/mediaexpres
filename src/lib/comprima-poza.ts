/**
 * Micsorarea pozelor in browser, inainte de urcare.
 *
 * 13.09.2026 — un client a spus ca „a pus pozele" si comanda a sosit cu
 * zero. Pozele de telefon (Android la 50MP, iPhone la 48MP) trec des de
 * 8MB, iar formularul le RESPINGEA: mesajul aparea jos, langa butonul de
 * trimitere, nu langa poze, si disparea la „Trimite". Omul chiar le
 * alesese. Pe ziar o poza nu are nevoie de mai mult de ~2000px pe latura
 * mare, deci o micsoram aici, pe telefonul lui, si urcam ~300-600KB in loc
 * de 12MB. Merge si mai repede pe 4G.
 *
 * Daca browserul nu poate decoda fisierul (HEIC pe Chrome/Android, format
 * ciudat), il lasam neatins — Cloudinary stie HEIC — si decide limita de
 * marime de mai departe.
 */

export const LATURA_MAX = 2000;
const CALITATE_JPEG = 0.86;
/** Sub pragul asta nu are rost sa atingem poza. */
const PRAG_NEATINS = 1.2 * 1024 * 1024;

export async function comprimaPoza(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  if (file.type && !file.type.startsWith("image/")) return file;
  if (file.size <= PRAG_NEATINS) return file;
  if (typeof createImageBitmap !== "function") return file;

  let bmp: ImageBitmap;
  try {
    // „from-image": rotim dupa EXIF, altfel pozele din telefon ies culcate.
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    return file;
  }
  try {
    const scara = Math.min(1, LATURA_MAX / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scara));
    const h = Math.max(1, Math.round(bmp.height * scara));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", CALITATE_JPEG));
    if (!blob || blob.size >= file.size) return file;
    const nume = file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
    return new File([blob], nume, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bmp.close?.();
  }
}
