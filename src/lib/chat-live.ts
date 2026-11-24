import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * 24.11.2026 (owner: "în admin să discutăm ca pe WhatsApp, dacă nu vrea pe
 * WhatsApp"): conversatiile "Vorbește cu un om" din chat sunt tinute pe server;
 * raspundem din /admin/chat si raspunsul apare in chatul clientului.
 * Acelasi mecanism ca la Media Chief, tabela proprie: chat_live.
 */
export type ChatMsg = { role: "user" | "assistant"; content: string; team?: boolean; at?: number };
export type ChatThread = {
  id: string;
  email: string | null;
  messages: ChatMsg[];
  human: boolean;
  source: string | null;
  updated_at: string;
  created_at: string;
  team_seen_at: string | null;
};

let ensured = false;
async function ensure() {
  if (ensured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chat_live (
      id text PRIMARY KEY,
      email text,
      messages jsonb NOT NULL DEFAULT '[]'::jsonb,
      human boolean NOT NULL DEFAULT false,
      source text,
      team_seen_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  ensured = true;
}

export const THREAD_RE = /^[A-Za-z0-9_-]{8,64}$/;

export async function getThread(id: string): Promise<ChatThread | null> {
  if (!THREAD_RE.test(id)) return null;
  await ensure();
  const rows = (await db.execute(sql`SELECT * FROM chat_live WHERE id = ${id}`)) as unknown as ChatThread[];
  return rows[0] || null;
}

/**
 * Saves what the visitor's browser sent. Team replies the browser has not
 * picked up yet are kept: the server copy is never shortened.
 */
export async function saveThread(
  id: string,
  messages: ChatMsg[],
  opts: { email?: string | null; human?: boolean; source?: string | null }
): Promise<ChatMsg[]> {
  if (!THREAD_RE.test(id)) return messages;
  await ensure();
  const old = await getThread(id);
  let merged = messages;
  if (old) {
    const seen = new Set(messages.map((m) => m.content));
    const missingTeam = old.messages.filter((m) => m.team && !seen.has(m.content));
    // Team messages the browser lacks go back in their place (before the newest visitor turn).
    if (missingTeam.length) merged = [...messages.slice(0, -1), ...missingTeam, ...messages.slice(-1)];
    // Keep the team flag the browser may have dropped.
    const team = new Set(old.messages.filter((m) => m.team).map((m) => m.content));
    merged = merged.map((m) => (team.has(m.content) ? { ...m, team: true } : m));
  }
  const json = JSON.stringify(merged.slice(-200));
  await db.execute(sql`
    INSERT INTO chat_live (id, email, messages, human, source)
    VALUES (${id}, ${opts.email || null}, ${json}::jsonb, ${opts.human === true}, ${opts.source || null})
    ON CONFLICT (id) DO UPDATE SET
      messages = EXCLUDED.messages,
      email = COALESCE(EXCLUDED.email, chat_live.email),
      human = chat_live.human OR EXCLUDED.human,
      source = COALESCE(chat_live.source, EXCLUDED.source),
      updated_at = now()`);
  return merged;
}

export async function addTeamReply(id: string, text: string): Promise<ChatThread | null> {
  const t = await getThread(id);
  if (!t) return null;
  const messages = [...t.messages, { role: "assistant" as const, content: text, team: true, at: Date.now() }];
  await db.execute(sql`
    UPDATE chat_live SET messages = ${JSON.stringify(messages)}::jsonb, human = true,
      team_seen_at = now(), updated_at = now() WHERE id = ${id}`);
  return { ...t, messages };
}

export async function markSeen(id: string) {
  await ensure();
  await db.execute(sql`UPDATE chat_live SET team_seen_at = now() WHERE id = ${id}`);
}

export async function listThreads(limit = 100): Promise<ChatThread[]> {
  await ensure();
  return (await db.execute(
    sql`SELECT * FROM chat_live ORDER BY updated_at DESC LIMIT ${limit}`
  )) as unknown as ChatThread[];
}
