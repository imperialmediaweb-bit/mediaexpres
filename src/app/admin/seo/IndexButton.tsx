"use client";

import { useState } from "react";
import { Loader2, Zap, CheckCircle2, AlertCircle } from "lucide-react";

interface Result {
  ok: boolean;
  totalInSitemap?: number;
  indexNow?: { ok: boolean; submitted: number; motoare: string; error?: string };
  google?: {
    configurat: boolean;
    ok: boolean;
    submitted: number;
    failed: number;
    error?: string;
    nota?: string;
  };
  pasiRamasi?: string[];
  error?: string;
}

export function IndexButton() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  async function run() {
    if (busy) return;
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch("/api/admin/indexeaza", { method: "POST" });
      setRes(await r.json());
    } catch (e) {
      setRes({ ok: false, error: e instanceof Error ? e.message : "Eroare" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-6 py-3.5 text-base font-bold text-white transition hover:bg-brand-red/90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
        {busy ? "Se trimite..." : "Trimite tot site-ul la indexare"}
      </button>

      {res && (
        <div className="mt-5 space-y-3">
          {res.error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{res.error}</p>
          )}

          {res.indexNow && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                res.indexNow.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"
              }`}
            >
              <p className="flex items-center gap-2 font-semibold">
                {res.indexNow.ok ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {res.indexNow.motoare}
              </p>
              <p className="mt-1">
                {res.indexNow.ok
                  ? `${res.indexNow.submitted} adrese anunțate. Indexare tipică: minute–ore.`
                  : `Nu a mers: ${res.indexNow.error}`}
              </p>
            </div>
          )}

          {res.google && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                res.google.ok
                  ? "bg-emerald-50 text-emerald-900"
                  : res.google.configurat
                    ? "bg-amber-50 text-amber-900"
                    : "bg-slate-100 text-slate-700"
              }`}
            >
              <p className="flex items-center gap-2 font-semibold">
                {res.google.ok ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                Google
              </p>
              <p className="mt-1">
                {!res.google.configurat
                  ? "Nu e conectat încă — vezi pașii de mai jos."
                  : res.google.ok
                    ? `${res.google.submitted} adrese anunțate${res.google.failed ? `, ${res.google.failed} respinse` : ""}. ${res.google.nota || ""}`
                    : `Nu a mers: ${res.google.error}`}
              </p>
            </div>
          )}

          {res.pasiRamasi && res.pasiRamasi.length > 0 && (
            <ul className="space-y-1.5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {res.pasiRamasi.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-slate-400">→</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
