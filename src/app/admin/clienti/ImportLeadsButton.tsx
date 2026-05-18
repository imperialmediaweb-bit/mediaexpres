"use client";

import { useState } from "react";
import { Upload, CheckCircle2, AlertCircle, X } from "lucide-react";

interface Result {
  parsed: number;
  imported: number;
  duplicates: number;
  importedList: string[];
  duplicateList?: string[];
  errors: string[];
}

export function ImportLeadsButton() {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit() {
    if (state === "loading" || raw.trim().length < 3) return;
    setState("loading");
    setResult(null);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/import-fb-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || "Eroare necunoscută");
        setState("error");
        return;
      }
      setResult(data);
      setState("done");
    } catch (e) {
      setErrorMsg(String(e));
      setState("error");
    }
  }

  function handleClose() {
    setOpen(false);
    setRaw("");
    setResult(null);
    setState("idle");
    setErrorMsg("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy/90"
      >
        <Upload className="h-4 w-4" />
        Import lead-uri Facebook
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-brand-navy">
                  Import lead-uri din Facebook
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Lipește mai jos lead-urile (export CSV din Meta Business Suite sau copy direct din Leads Center). Un lead pe linie. Detectez automat nume, email, telefon.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={`Exemple acceptate:
Ion Popescu, ion@example.ro, 0721123456
Maria Ionescu | maria@firma.ro | +40 722 111 222
George Vasile   george@vasile.ro   0733-444-555

Sau lipește direct CSV-ul exportat din Meta (cu header — îl ignor automat).`}
              rows={10}
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
              disabled={state === "loading"}
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Renunță
              </button>
              <button
                onClick={handleSubmit}
                disabled={state === "loading" || raw.trim().length < 3}
                className="rounded-lg bg-brand-red px-5 py-2 text-sm font-semibold text-white hover:bg-brand-red/90 disabled:opacity-50"
              >
                {state === "loading" ? "Se importă..." : "Importă lead-urile"}
              </button>
            </div>

            {state === "done" && result && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-xs">
                <div className="flex items-center gap-2 font-semibold text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  Detectate {result.parsed} · Importate {result.imported} · Duplicate {result.duplicates}
                </div>
                {result.importedList.length > 0 && (
                  <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-green-700">
                    {result.importedList.map((l, i) => (
                      <li key={i}>+ {l}</li>
                    ))}
                  </ul>
                )}
                {result.duplicateList && result.duplicateList.length > 0 && (
                  <div className="mt-2 text-slate-500">
                    <p className="font-medium">Deja existau (ignorate):</p>
                    <ul className="space-y-0.5">
                      {result.duplicateList.map((l, i) => (
                        <li key={i}>· {l}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div className="mt-2 text-red-700">
                    {result.errors.map((e, i) => (
                      <p key={i}>⚠ {e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {state === "error" && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4" />
                {errorMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
