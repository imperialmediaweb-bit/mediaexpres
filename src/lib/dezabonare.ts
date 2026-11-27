import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { SITE } from "@/data/site";

/**
 * 27.11.2026 (owner, dupa „STOP" de la un lead: „pune undeva un buton unde sa
 * dezaboneze, nu exista"): link de dezabonare in emailurile de marketing.
 * Lista dezabonatilor sta in app_setting „dezabonati". La dezabonare se anuleaza
 * si emailurile deja programate la Resend catre adresa respectiva.
 */
const CHEIE = "dezabonati";

function secret(): string {
  return process.env.SESSION_SECRET || "dev-secret-change-in-production-please-32-chars";
}

export function tokenDezabonare(email: string): string {
  return crypto.createHmac("sha256", secret()).update(`dezabonare:${email.trim().toLowerCase()}`).digest("hex").slice(0, 32);
}

export function tokenValid(email: string, token: string): boolean {
  const a = Buffer.from(tokenDezabonare(email));
  const b = Buffer.from(String(token || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function linkDezabonare(email: string): string {
  const e = email.trim().toLowerCase();
  return `${SITE.url}/dezabonare?e=${encodeURIComponent(e)}&t=${tokenDezabonare(e)}`;
}

/** Antetul List-Unsubscribe (Gmail / Outlook arata butonul lor de dezabonare). */
export function antetDezabonare(email: string): string {
  const e = email.trim().toLowerCase();
  return `<${SITE.url}/api/dezabonare?e=${encodeURIComponent(e)}&t=${tokenDezabonare(e)}>, <mailto:contact@mediaexpress.ro?subject=STOP>`;
}

/** Rândul din josul emailului. */
export function subsolDezabonare(email: string): string {
  return `<p style="margin-top:28px;font-size:12px;color:#94a3b8;text-align:center;">Nu mai vrei emailuri de la noi? <a href="${linkDezabonare(email)}" style="color:#94a3b8;text-decoration:underline;">Dezabonează-te</a>.</p>`;
}

async function lista(): Promise<string[]> {
  try {
    const [r] = await db.select().from(appSettings).where(eq(appSettings.key, CHEIE)).limit(1);
    return r ? (JSON.parse(r.value) as string[]) : [];
  } catch {
    return [];
  }
}

export async function esteDezabonat(email: string | string[] | null | undefined): Promise<boolean> {
  const e = (Array.isArray(email) ? email[0] : email || "").trim().toLowerCase();
  if (!e) return false;
  return (await lista()).includes(e);
}

/** Anuleaza emailurile programate la Resend catre adresa asta (ex. follow-up-urile de 3 si 7 zile). */
async function anuleazaProgramate(email: string): Promise<number> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return 0;
  let anulate = 0;
  let after: string | undefined;
  for (let pagina = 0; pagina < 10; pagina++) {
    const r = await fetch(`https://api.resend.com/emails?limit=100${after ? `&after=${after}` : ""}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    if (!r || !r.ok) break;
    const j = (await r.json().catch(() => ({}))) as {
      data?: { id: string; to?: string[]; last_event?: string; scheduled_at?: string | null }[];
      has_more?: boolean;
    };
    const d = j.data || [];
    for (const m of d) {
      const catre = (m.to || []).map((x) => x.toLowerCase());
      if (catre.includes(email) && m.last_event === "scheduled") {
        const c = await fetch(`https://api.resend.com/emails/${m.id}/cancel`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
        }).catch(() => null);
        if (c?.ok) anulate++;
      }
    }
    if (!j.has_more || !d.length) break;
    after = d[d.length - 1].id;
  }
  return anulate;
}

export async function dezaboneaza(email: string): Promise<{ anulate: number }> {
  const e = email.trim().toLowerCase();
  const l = await lista();
  if (!l.includes(e)) {
    const v = JSON.stringify([...l, e]);
    await db
      .insert(appSettings)
      .values({ key: CHEIE, value: v })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: v, updatedAt: new Date() } });
  }
  const anulate = await anuleazaProgramate(e).catch(() => 0);
  return { anulate };
}
