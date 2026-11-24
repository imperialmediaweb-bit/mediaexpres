import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getThread, saveThread, type ChatMsg } from "@/lib/chat-live";
import { sendEmail, wrapEmail, kv, escapeHtml as esc, ADMIN_EMAIL } from "@/lib/email";
import { SITE } from "@/data/site";
import { trimitePushAdmin } from "@/lib/admin-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 24.11.2026 — "Vorbește cu un om, aici în chat". Mesajele clientului nu mai
 * merg la AI: se salveaza si ne vin pe email pe loc, cu buton spre
 * /admin/chat, de unde raspundem; raspunsul apare in chatul lui (GET, la 5 s).
 */
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 40;
}

const schema = z.object({
  thread: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(3000), team: z.boolean().optional() }))
    .min(1)
    .max(200),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(40).optional(),
  start: z.boolean().optional(),
  page: z.string().max(200).optional(),
});

function transcript(all: ChatMsg[]) {
  return all
    .slice(-30)
    .map((m) => `<p style="margin:8px 0;"><strong>${m.role === "user" ? "Client" : m.team ? "Noi" : "Consultant AI"}:</strong> ${esc(m.content)}</p>`)
    .join("");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (limited(ip)) return NextResponse.json({ ok: false, error: "Prea multe mesaje. Scrie-ne pe WhatsApp." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });
  const { thread, messages, start } = parsed.data;
  const old = await getThread(thread).catch(() => null);
  const email = parsed.data.email || old?.email || null;
  const all = await saveThread(thread, messages, { email, human: true, source: parsed.data.page || null });
  const last = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const link = `${SITE.url}/admin/chat?id=${thread}`;
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: start ? `💬 Client vrea să vorbească cu un om (chat site)${email ? ` — ${email}` : ""}` : `💬 Mesaj nou pe chat${email ? ` — ${email}` : ""}: "${last.slice(0, 60)}"`,
    ...(email ? { replyTo: email } : {}),
    html: wrapEmail(
      start ? "Un client vrea să vorbească cu un om" : "Mesaj nou în chat",
      `<table style="width:100%;border-collapse:collapse;">${kv("Email client", email || "nu l-a dat")}${parsed.data.phone ? kv("Telefon", parsed.data.phone) : ""}${kv("Pagina", parsed.data.page || "-")}</table>
      <p style="margin:18px 0;"><a href="${link}" style="background:#c1121f;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Răspunde în chat →</a></p>
      <div>${transcript(all)}</div>
      <p style="margin-top:16px;color:#64748b;">Ce scrii din admin apare pe loc în chatul clientului${email ? ", și pe email" : ""}.</p>`
    ),
  }).catch((e: unknown) => console.error("[chat live] email:", e));
  await trimitePushAdmin(
    start ? "💬 Client vrea să vorbească cu un om" : `💬 Mesaj nou${email ? ` — ${email}` : ""}`,
    last || "Chat site",
    `/admin/chat?id=${thread}`
  ).catch((e: unknown) => console.error("[chat live] push:", e));
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const t = await getThread(req.nextUrl.searchParams.get("thread") || "").catch(() => null);
  return NextResponse.json({ ok: true, messages: t?.messages || [] });
}
