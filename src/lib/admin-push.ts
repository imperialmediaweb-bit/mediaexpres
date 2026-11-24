import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

/**
 * 24.11.2026 (owner: „notificare push pe telefon, direct din site") — notificari
 * pentru admin (chat live). Cheile VAPID se fac o singura data si stau in
 * app_setting, ca sa nu depinda de o variabila pusa de mana pe Railway.
 * Abonamentele (telefoanele adminului) stau tot acolo.
 */
const K_VAPID = "admin_push_vapid";
const K_SUBS = "admin_push_subs";

type Vapid = { publicKey: string; privateKey: string };
type Sub = webpush.PushSubscription & { at?: number };

async function citeste<T>(key: string): Promise<T | null> {
  const [r] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  if (!r) return null;
  try {
    return JSON.parse(r.value) as T;
  } catch {
    return null;
  }
}

async function scrie(key: string, v: unknown) {
  const value = JSON.stringify(v);
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}

export async function cheiVapid(): Promise<Vapid> {
  const v = await citeste<Vapid>(K_VAPID);
  if (v?.publicKey && v.privateKey) return v;
  const nou = webpush.generateVAPIDKeys();
  await scrie(K_VAPID, nou);
  return nou;
}

export async function salveazaAbonament(sub: Sub) {
  const subs = (await citeste<Sub[]>(K_SUBS)) || [];
  const rest = subs.filter((s) => s.endpoint !== sub.endpoint);
  await scrie(K_SUBS, [...rest, { ...sub, at: Date.now() }].slice(-10));
}

export async function trimitePushAdmin(titlu: string, text: string, url: string): Promise<number> {
  const subs = (await citeste<Sub[]>(K_SUBS)) || [];
  if (!subs.length) return 0;
  const v = await cheiVapid();
  webpush.setVapidDetails("mailto:contact@mediaexpress.ro", v.publicKey, v.privateKey);
  const payload = JSON.stringify({ title: titlu, body: text.slice(0, 180), url });
  let ok = 0;
  const morti: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(s, payload, { TTL: 3600, urgency: "high" });
        ok++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) morti.push(s.endpoint);
        else console.error("[admin push]", code, e);
      }
    })
  );
  if (morti.length) await scrie(K_SUBS, subs.filter((s) => !morti.includes(s.endpoint)));
  return ok;
}
