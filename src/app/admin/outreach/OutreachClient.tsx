"use client";

import { useState } from "react";
import { Copy, ExternalLink, Sparkles, Check, Loader2 } from "lucide-react";

type Prospect = {
  id: string;
  contactName: string | null;
  contactTitle: string | null;
  companyName: string;
  city: string | null;
  linkedinUrl: string | null;
  lastEmailBody: string | null;
};

type RowState = {
  message: string;
  generating: boolean;
  sending: boolean;
  sent: boolean;
  copied: boolean;
  error: string | null;
};

export function OutreachClient({ initialProspects }: { initialProspects: Prospect[] }) {
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {};
    for (const p of initialProspects) {
      init[p.id] = {
        message: p.lastEmailBody || "",
        generating: false,
        sending: false,
        sent: false,
        copied: false,
        error: null,
      };
    }
    return init;
  });
  const [bulkLoading, setBulkLoading] = useState(false);

  function update(id: string, patch: Partial<RowState>) {
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  }

  async function generate(id: string) {
    update(id, { generating: true, error: null });
    try {
      const res = await fetch("/api/admin/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Eroare");
      update(id, { message: json.message, generating: false });
    } catch (e) {
      update(id, {
        generating: false,
        error: e instanceof Error ? e.message : "Eroare",
      });
    }
  }

  async function generateAll() {
    const ids = initialProspects
      .filter((p) => !rows[p.id]?.message && !rows[p.id]?.sent)
      .map((p) => p.id);
    if (ids.length === 0) return;
    setBulkLoading(true);
    // Generăm secvențial ca să nu lovim rate-limit OpenAI prea agresiv.
    for (const id of ids) {
      await generate(id);
    }
    setBulkLoading(false);
  }

  async function copy(id: string) {
    const text = rows[id]?.message || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      update(id, { copied: true });
      setTimeout(() => update(id, { copied: false }), 2000);
    } catch {
      // Fallback simplu
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      update(id, { copied: true });
      setTimeout(() => update(id, { copied: false }), 2000);
    }
  }

  async function markSent(id: string) {
    update(id, { sending: true, error: null });
    try {
      const res = await fetch("/api/admin/outreach/mark-sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: id, message: rows[id]?.message || "" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Eroare");
      update(id, { sending: false, sent: true });
    } catch (e) {
      update(id, {
        sending: false,
        error: e instanceof Error ? e.message : "Eroare",
      });
    }
  }

  const remaining = initialProspects.filter((p) => !rows[p.id]?.sent).length;
  const withMessages = initialProspects.filter((p) => rows[p.id]?.message).length;

  if (initialProspects.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">
          Niciun prospect nou din LinkedIn. Folosește extensia pe LinkedIn ca să
          capturezi profile noi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-red/20 bg-brand-red/5 p-4">
        <div className="text-sm">
          <strong className="text-brand-navy">{remaining}</strong> rămași ·{" "}
          <strong className="text-brand-navy">{withMessages}</strong> cu mesaj gata
        </div>
        <button
          onClick={generateAll}
          disabled={bulkLoading || remaining === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-red/90 disabled:opacity-60"
        >
          {bulkLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generez...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generează mesaje pentru toți
            </>
          )}
        </button>
      </div>

      <ol className="space-y-3">
        {initialProspects.map((p, idx) => {
          const r = rows[p.id];
          if (r.sent) return null;
          return (
            <li
              key={p.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="mr-2 text-xs font-medium text-slate-400">
                    #{idx + 1}
                  </span>
                  <span className="font-serif text-lg font-semibold text-brand-navy">
                    {p.contactName || "(fără nume)"}
                  </span>
                </div>
                {p.linkedinUrl && (
                  <a
                    href={p.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Deschide LinkedIn
                  </a>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {p.contactTitle || "—"}
                {p.companyName && p.companyName !== "(necunoscut)" && (
                  <> · <strong className="text-slate-700">{p.companyName}</strong></>
                )}
                {p.city && <> · {p.city}</>}
              </p>

              <textarea
                rows={3}
                value={r.message}
                onChange={(e) => update(p.id, { message: e.target.value })}
                placeholder={
                  r.generating
                    ? "AI scrie mesajul..."
                    : 'Apasă „Generează” sau scrie manual mesajul aici'
                }
                disabled={r.generating}
                className="mt-3 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              />
              {r.message && (
                <p className="mt-1 text-xs text-slate-500">
                  {r.message.length}/300 caractere{" "}
                  {r.message.length > 300 && (
                    <span className="text-red-600">
                      (prea lung pentru nota de Connect — scurtează)
                    </span>
                  )}
                </p>
              )}

              {r.error && (
                <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                  {r.error}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {!r.message && (
                  <button
                    onClick={() => generate(p.id)}
                    disabled={r.generating}
                    className="inline-flex items-center gap-1 rounded-md bg-brand-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-navy/90 disabled:opacity-60"
                  >
                    {r.generating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Generează mesaj
                  </button>
                )}
                {r.message && (
                  <>
                    <button
                      onClick={() => copy(p.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {r.copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-600" /> Copiat
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copiază
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => generate(p.id)}
                      disabled={r.generating}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {r.generating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Re-generează
                    </button>
                    <button
                      onClick={() => markSent(p.id)}
                      disabled={r.sending}
                      className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      {r.sending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Marchează trimis
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
