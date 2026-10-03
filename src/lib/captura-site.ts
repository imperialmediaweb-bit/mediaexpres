import { getCloudinaryConfig, signUploadParams } from "@/lib/cloudinary";

/**
 * Captura site-ului clientului, ca poza de rezerva (03.10.2026).
 *
 * Proprietarul: „pozele optional, sau daca nu, facem un screen pe site".
 * Pana acum pozele blocau trimiterea (3, apoi 1 obligatorie) si doi clienti
 * platiti la rand n-au mai trimis nimic. Acum: fara poze, articolul pleaca
 * oricum, iar imaginea principala e o captura a site-ului lui, facuta aici,
 * pe server, si copiata in Cloudinary ca sa nu dispara.
 *
 * Doua servicii gratuite, unul dupa altul: thum.io (raspunde cu poza direct)
 * si mShots de la WordPress (uneori intoarce intai un GIF „se genereaza",
 * pe care il refuzam). Daca pica amandoua, articolul ramane fara poza, ca
 * inainte, si adminul vede asta.
 */

const TIMP_MAXIM_MS = 25_000;

function urlCurat(site: string): string | null {
  const t = (site || "").trim();
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    if (!/\./.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function descarcaImagine(url: string): Promise<{ bytes: Buffer; tip: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMP_MAXIM_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "MediaExpres/1.0 (+https://mediaexpress.ro)" } });
    const tip = r.headers.get("content-type") || "";
    if (!r.ok || !/^image\/(png|jpe?g|webp)/i.test(tip)) return null;
    const bytes = Buffer.from(await r.arrayBuffer());
    // Sub 10KB nu e o captura, e un placeholder.
    if (bytes.length < 10_000) return null;
    return { bytes, tip: tip.split(";")[0] };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Sursele, in ordinea incercarii. Exportat pentru teste. */
export function surseCaptura(site: string): string[] {
  return [
    `https://image.thum.io/get/width/1200/crop/675/noanimate/${site}`,
    `https://s0.wp.com/mshots/v1/${encodeURIComponent(site)}?w=1200&h=675`,
  ];
}

export interface PozaCaptura {
  url: string;
  publicId: string;
  capturaSite: true;
}

export async function capturaSite(siteUrl: string | null | undefined, sessionId: string): Promise<PozaCaptura | null> {
  const site = urlCurat(siteUrl || "");
  if (!site) return null;
  const cfg = getCloudinaryConfig();
  if (!cfg) return null;

  let imagine: { bytes: Buffer; tip: string } | null = null;
  for (const sursa of surseCaptura(site)) {
    imagine = await descarcaImagine(sursa);
    if (imagine) break;
  }
  if (!imagine) return null;

  const folder = `${cfg.uploadFolder}/comenzi/${sessionId}`;
  const publicId = "captura-site";
  const timestamp = Math.floor(Date.now() / 1000);
  const semnat = signUploadParams({ folder, public_id: publicId, timestamp });
  if (!semnat) return null;
  const fd = new FormData();
  fd.set("file", `data:${imagine.tip};base64,${imagine.bytes.toString("base64")}`);
  fd.set("folder", folder);
  fd.set("public_id", publicId);
  fd.set("timestamp", String(timestamp));
  fd.set("signature", String(semnat.signature));
  fd.set("api_key", cfg.apiKey);
  try {
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, { method: "POST", body: fd });
    if (!r.ok) {
      console.warn("[captura-site] cloudinary", r.status, (await r.text()).slice(0, 200));
      return null;
    }
    const j = (await r.json()) as { secure_url?: string; public_id?: string };
    if (!j.secure_url) return null;
    return { url: j.secure_url, publicId: j.public_id || `${folder}/${publicId}`, capturaSite: true };
  } catch (e) {
    console.warn("[captura-site]", e instanceof Error ? e.message : e);
    return null;
  }
}
