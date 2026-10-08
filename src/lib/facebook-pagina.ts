import { RETEA_URL } from "@/lib/retea";

/**
 * Postare pe pagina de Facebook Media Express (08.10.2026).
 *
 * Doua drumuri, in ordinea asta:
 *  1. FB_PAGE_TOKEN (+ FB_PAGE_ID) in Railway → direct la Graph API.
 *  2. Fara token: prin aplicatia retelei, care are deja paginile conectate
 *     prin Facebook Login si posteaza automat pe ele (POST /api/facebook/post,
 *     cheia RETEA_KEY = CRON_SECRET al retelei). Proprietarul: „am deja
 *     aplicatia retelei care publica, pot lega si pagina Media Express".
 *     Pagina trebuie conectata acolo, in /admin/facebook.
 */

export const PAGINA_MEDIA_EXPRESS = "175956812269958";

export function configFacebookPagina(): { drum: "direct" | "retea"; pageId: string } | null {
  const pageId = process.env.FB_PAGE_ID?.trim() || PAGINA_MEDIA_EXPRESS;
  if (process.env.FB_PAGE_TOKEN?.trim()) return { drum: "direct", pageId };
  if (process.env.RETEA_KEY?.trim()) return { drum: "retea", pageId };
  return null;
}

export type RezultatPostare = { ok: true; id: string } | { ok: false; motiv: string };

export async function posteazaPePagina(d: { mesaj: string; link?: string; poza?: string | null }): Promise<RezultatPostare> {
  const cfg = configFacebookPagina();
  if (!cfg) return { ok: false, motiv: "Nu e nicio cale de postare: lipsesc FB_PAGE_TOKEN și RETEA_KEY" };
  try {
    if (cfg.drum === "direct") {
      const token = process.env.FB_PAGE_TOKEN!.trim();
      const r = d.poza
        ? await fetch(`https://graph.facebook.com/v21.0/${cfg.pageId}/photos`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: d.poza, message: d.link ? `${d.mesaj}` : d.mesaj, access_token: token }),
          })
        : await fetch(`https://graph.facebook.com/v21.0/${cfg.pageId}/feed`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ message: d.mesaj, ...(d.link ? { link: d.link } : {}), access_token: token }),
          });
      const j = (await r.json()) as { id?: string; post_id?: string; error?: { message?: string } };
      const id = j.post_id || j.id;
      return r.ok && id ? { ok: true, id } : { ok: false, motiv: j.error?.message || `Facebook ${r.status}` };
    }
    // Prin retea: doar text + link (previzualizarea linkului aduce poza paginii).
    const r = await fetch(`${RETEA_URL}/api/facebook/post`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${process.env.RETEA_KEY!.trim()}` },
      body: JSON.stringify({ page_id: cfg.pageId, message: d.mesaj, ...(d.link ? { link: d.link } : {}) }),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; fb_post_id?: string; error?: string };
    if (r.ok && j.fb_post_id) return { ok: true, id: j.fb_post_id };
    const motiv =
      r.status === 404
        ? "Pagina Media Express nu e conectată în aplicația rețelei (botosaniexpres.ro/admin/facebook)"
        : j.error || `rețeaua a răspuns ${r.status}`;
    return { ok: false, motiv };
  } catch (e) {
    return { ok: false, motiv: e instanceof Error ? e.message : String(e) };
  }
}
