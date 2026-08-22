"use client";

import { useState } from "react";
import { Loader2, Send, Clock, CheckCircle2 } from "lucide-react";

export function ComposeForm() {
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [template, setTemplate] = useState<"brand" | "personal">("brand");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");

  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recipients = recipientsRaw
    .split(/[\n,;]+/)
    .map((r) => r.trim())
    .filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setDone(null);

    if (recipients.length === 0) {
      setError("Pune cel puțin un email valid (unul pe linie sau despărțite cu virgulă).");
      return;
    }
    if (when === "later" && !scheduledAt) {
      setError("Alege data și ora la care să plece emailul.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          subject,
          body,
          template,
          ...(when === "later"
            ? { scheduledAt: new Date(scheduledAt).toISOString() }
            : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Trimiterea a eșuat");

      setDone(
        json.scheduled
          ? `Programat: ${json.sent} email${json.sent === 1 ? "" : "uri"} vor pleca la ${new Date(scheduledAt).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}.`
          : `Trimis către ${json.sent} destinatar${json.sent === 1 ? "" : "i"}.`,
      );
      setRecipientsRaw("");
      setSubject("");
      setBody("");
      setScheduledAt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare neașteptată");
    } finally {
      setSending(false);
    }
  }

  // datetime-local vrea format local yyyy-MM-ddTHH:mm — minim peste 5 minute
  const minLocal = new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16);
  const maxLocal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Destinatari{" "}
          <span className="font-normal text-slate-500">
            (unul pe linie{recipients.length > 0 ? ` — ${recipients.length} valizi` : ""})
          </span>
        </label>
        <textarea
          value={recipientsRaw}
          onChange={(e) => setRecipientsRaw(e.target.value)}
          rows={3}
          placeholder={"client1@firma.ro\nclient2@firma.ro"}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs focus:border-brand-red focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Subiect *</label>
        <input
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subiectul emailului"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Mesaj *</label>
        <textarea
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          placeholder={"Salut,\n\nScrie mesajul aici. Liniile goale despart paragrafele.\n\nMulțumim!"}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm leading-relaxed focus:border-brand-red focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Aspect</label>
          <div className="flex gap-2">
            {(
              [
                ["brand", "Antet MediaExpres"],
                ["personal", "Scrisoare simplă"],
              ] as ["brand" | "personal", string][]
            ).map(([t, label]) => (
              <label
                key={t}
                className={`flex-1 cursor-pointer rounded-xl border-2 p-2.5 text-center text-xs font-medium transition ${
                  template === t
                    ? "border-brand-red bg-red-50 text-brand-red"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  checked={template === t}
                  onChange={() => setTemplate(t)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Când pleacă</label>
          <div className="flex gap-2">
            {(
              [
                ["now", "Acum"],
                ["later", "Programează"],
              ] as ["now" | "later", string][]
            ).map(([w, label]) => (
              <label
                key={w}
                className={`flex-1 cursor-pointer rounded-xl border-2 p-2.5 text-center text-xs font-medium transition ${
                  when === w
                    ? "border-brand-red bg-red-50 text-brand-red"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="when"
                  checked={when === w}
                  onChange={() => setWhen(w)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {when === "later" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Data și ora trimiterii
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            min={minLocal}
            max={maxLocal}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            Maximum 30 de zile în avans. Emailul pleacă singur, chiar dacă nu ești logat.
          </p>
        </div>
      )}

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {done && (
        <p className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {done}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-red px-6 py-3 font-semibold text-white transition hover:bg-brand-red/90 disabled:opacity-60"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : when === "later" ? (
          <Clock className="h-4 w-4" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {when === "later" ? "Programează trimiterea" : "Trimite acum"}
      </button>
    </form>
  );
}
