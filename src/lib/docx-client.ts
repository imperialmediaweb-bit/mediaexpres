/**
 * Partea din browser a importului din Word: trimite .docx-ul la /api/docx
 * si intoarce textul, pozele (deja pe Cloudinary) si linkurile.
 * Folosit de formularul de dupa plata cu cardul si de cel prin OP.
 */

export interface DocxImportat {
  title: string;
  body: string;
  /** „ancoră → adresă", o linie pe link. */
  linkNotes: string;
  images: { url: string; publicId: string; name: string }[];
  pozeInDocument: number;
  pozePreaMari: number;
  pozeNeurcate: number;
}

export async function importaDocx(file: File, token?: string): Promise<DocxImportat> {
  const fd = new FormData();
  fd.append("file", file);
  if (token) fd.append("token", token);
  const res = await fetch("/api/docx", { method: "POST", body: fd });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(j.error || "Nu am putut citi documentul Word.");
  return j as DocxImportat;
}

/** Ce ii spunem clientului dupa import — cate poze au intrat, cate nu si de ce. */
export function mesajImportDocx(d: DocxImportat, locuriLibere: number): string {
  const parti: string[] = [];
  parti.push(d.body ? "Am luat textul din document." : "Documentul nu are text.");
  const puse = Math.min(d.images.length, locuriLibere);
  if (d.pozeInDocument === 0) parti.push("Nu am găsit poze în el.");
  else parti.push(`Poze: ${puse} din ${d.pozeInDocument} din document.`);
  if (d.pozePreaMari) parti.push(`${d.pozePreaMari} ${d.pozePreaMari === 1 ? "poză e" : "poze sunt"} peste 8MB — urc-o separat, micșorată.`);
  if (d.pozeNeurcate) parti.push(`${d.pozeNeurcate} nu s-au putut urca — încearcă separat.`);
  if (d.linkNotes) parti.push("Linkurile puse pe cuvinte au intrat la „Linkurile dorite”.");
  parti.push("Verifică textul înainte de trimitere.");
  return parti.join(" ");
}
