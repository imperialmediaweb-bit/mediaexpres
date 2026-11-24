"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Row = {
  id: string;
  email: string | null;
  human: boolean;
  source: string | null;
  updated_at: string;
  count: number;
  last: string;
  waiting: boolean;
};
type Msg = { role: "user" | "assistant"; content: string; team?: boolean };
type Thread = { id: string; email: string | null; human: boolean; source: string | null; messages: Msg[] };

function when(s: string) {
  const d = new Date(s);
  return d.toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Chat live: lista in stanga, conversatia in dreapta; se reimprospateaza la 5 secunde. */
export function ChatInbox({ initialId }: { initialId: string | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [id, setId] = useState<string | null>(initialId);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/chat", { cache: "no-store" });
      const d = await r.json();
      if (d.ok) setRows(d.threads);
      if (id) {
        const t = await fetch(`/api/admin/chat?id=${id}`, { cache: "no-store" }).then((x) => x.json());
        if (t.ok) setThread(t.thread);
      }
    } catch {}
  }, [id]);

  useEffect(() => {
    void load();
    const iv = setInterval(load, 5_000);
    return () => clearInterval(iv);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  async function reply() {
    if (!id || !text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const r = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, text }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setThread(d.thread);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nu s-a trimis");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="max-h-[75vh] overflow-y-auto rounded-xl border border-slate-200 bg-white">
        {rows.length === 0 && <p className="p-4 text-sm text-slate-500">Nicio conversație încă.</p>}
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setId(r.id)}
            className={`block w-full border-b border-slate-100 p-3 text-left text-sm hover:bg-slate-50 ${r.id === id ? "bg-slate-100" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold text-brand-navy">{r.email || "Client (fără email)"}</span>
              <span className="shrink-0 text-xs text-slate-500">{when(r.updated_at)}</span>
            </div>
            <div className="mt-1 flex gap-1">
              {r.human && <span className="rounded bg-emerald-100 px-1.5 text-[11px] font-semibold text-emerald-800">vrea un om</span>}
              {r.waiting && <span className="rounded bg-red-100 px-1.5 text-[11px] font-semibold text-red-700">așteaptă răspuns</span>}
              {r.source && <span className="truncate text-[11px] text-slate-500">{r.source}</span>}
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-slate-600">{r.last}</p>
          </button>
        ))}
      </div>

      <div className="flex h-[75vh] flex-col rounded-xl border border-slate-200 bg-white">
        {!thread ? (
          <p className="p-6 text-sm text-slate-500">Alege o conversație din stânga.</p>
        ) : (
          <>
            <div className="border-b border-slate-200 p-3 text-sm">
              <strong>{thread.email || "Client fără email"}</strong>
              {thread.source && <span className="ml-2 text-slate-500">· {thread.source}</span>}
              {!thread.email && (
                <span className="ml-2 text-xs text-amber-700">Răspunde cât e pe site — nu avem email să-l mai prindem după.</span>
              )}
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
              {thread.messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-white text-slate-800 shadow-sm"
                      : m.team
                        ? "ml-auto bg-emerald-600 text-white"
                        : "ml-auto bg-slate-200 text-slate-700"
                  }`}
                >
                  <span className="mb-0.5 block text-[11px] font-semibold opacity-70">
                    {m.role === "user" ? "Client" : m.team ? "Noi" : "AI"}
                  </span>
                  {m.content}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form
              className="flex gap-2 border-t border-slate-200 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void reply();
              }}
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void reply();
                  }
                }}
                rows={2}
                placeholder="Scrie răspunsul… Enter trimite"
                className="flex-1 resize-none rounded-lg border border-slate-300 p-2 text-sm"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="rounded-lg bg-brand-red px-4 text-sm font-semibold text-white disabled:opacity-40"
              >
                {sending ? "…" : "Trimite"}
              </button>
            </form>
            {error && <p className="px-3 pb-2 text-sm text-red-600">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
