import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { addTeamReply, getThread, listThreads, markSeen } from "@/lib/chat-live";
import { sendEmail, wrapEmail } from "@/lib/email";
import { SITE } from "@/data/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 24.11.2026 — chat live in admin: lista (GET), un chat (GET ?id=), raspuns (POST). */
export async function GET(req: NextRequest) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const t = await getThread(id);
    if (!t) return NextResponse.json({ ok: false, error: "Negăsit" }, { status: 404 });
    await markSeen(id).catch(() => undefined);
    return NextResponse.json({ ok: true, thread: t });
  }
  const threads = await listThreads(150);
  return NextResponse.json({
    ok: true,
    threads: threads.map((t) => {
      const last = t.messages.at(-1);
      return {
        id: t.id,
        email: t.email,
        human: t.human,
        source: t.source,
        updated_at: t.updated_at,
        count: t.messages.filter((m) => m.role === "user").length,
        last: last ? `${last.role === "user" ? "Client" : last.team ? "Noi" : "AI"}: ${last.content.slice(0, 120)}` : "",
        waiting: last?.role === "user",
      };
    }),
  });
}

const schema = z.object({ id: z.string().min(8).max(64), text: z.string().trim().min(1).max(3000) });

export async function POST(req: NextRequest) {
  const s = getSession();
  if (!s) return NextResponse.json({ ok: false, error: "Neautentificat" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Scrie un mesaj" }, { status: 400 });
  const t = await addTeamReply(parsed.data.id, parsed.data.text);
  if (!t) return NextResponse.json({ ok: false, error: "Chat negăsit" }, { status: 404 });
  // Clientul poate fi plecat de pe site: daca a lasat email, raspunsul ajunge si acolo.
  if (t.email) {
    await sendEmail({
      to: t.email,
      subject: "MediaExpres — răspuns la întrebarea dvs.",
      html: wrapEmail(
        "Răspuns de la echipa MediaExpres",
        `<p style="white-space:pre-wrap;">${parsed.data.text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</p>
        <p style="margin-top:18px;">Puteți răspunde la acest email, ne puteți scrie pe WhatsApp la ${SITE.phone}, sau continuați în chat pe <a href="${SITE.url}">${SITE.url.replace(/^https?:\/\//, "")}</a>.</p>`
      ),
    }).catch((e: unknown) => console.error("[admin chats] email:", e));
  }
  return NextResponse.json({ ok: true, thread: t });
}
