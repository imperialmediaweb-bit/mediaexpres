"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";

export function ReplyBox({
  defaultTo,
  defaultSubject,
}: {
  defaultTo: string;
  defaultSubject: string;
}) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setError(null);
    if (!to.trim()) return setError("Completează adresa destinatarului.");
    if (body.trim().length < 10) return setError("Scrie mesajul (minim 10 caractere).");

    setSending(true);
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: [to.trim()],
          subject: subject.trim(),
          body: body.trim(),
          // Raspunsul la un om real nu trebuie sa arate a newsletter.
          template: "personal",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Eroare la trimitere");
      setSent(true);
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare necunoscută");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-8 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <div className="text-sm">
          <p className="font-semibold text-emerald-900">Răspuns trimis către {to}</p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-1 text-emerald-700 underline hover:text-emerald-900"
          >
            Scrie încă un mesaj
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-serif text-lg font-semibold text-brand-navy">
        Răspunde clientului
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Pleacă de pe adresa site-ului, prin Resend. Nu ai nevoie de webmail.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Către</span>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-600">Subiect</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-600">Mesaj</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            placeholder={
              "Bună ziua,\n\nAm primit solicitarea dumneavoastră...\n\nCu respect,\nMediaExpres"
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
          />
        </label>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        onClick={send}
        disabled={sending}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-red/90 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {sending ? "Se trimite..." : "Trimite răspunsul"}
      </button>
    </div>
  );
}
