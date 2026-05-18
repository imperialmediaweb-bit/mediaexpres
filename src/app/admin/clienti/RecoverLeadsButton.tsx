"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface Result {
  found: number;
  imported: number;
  importedList: string[];
  errors: string[];
}

export function RecoverLeadsButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleClick() {
    if (state === "loading") return;
    setState("loading");
    setResult(null);
    try {
      const res = await fetch("/api/admin/recover-fb-leads", { method: "POST" });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || "Eroare necunoscuta");
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

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-amber-800">Recuperare leads Facebook (one-time)</p>
          <p className="mt-0.5 text-xs text-amber-700">
            Importa leads din Resend care nu au fost salvate in DB.
          </p>
        </div>
        <button
          onClick={handleClick}
          disabled={state === "loading"}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${state === "loading" ? "animate-spin" : ""}`} />
          {state === "loading" ? "Se importa..." : "Importa acum"}
        </button>
      </div>

      {state === "done" && result && (
        <div className="mt-3 rounded-lg bg-white p-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Gasit {result.found} emailuri [FB Lead] — importat {result.imported}
          </div>
          {result.importedList.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-slate-600">
              {result.importedList.map((l, i) => <li key={i}>• {l}</li>)}
            </ul>
          )}
          {result.errors.length > 0 && (
            <div className="mt-2 text-red-600">
              {result.errors.map((e, i) => <p key={i}>⚠ {e}</p>)}
            </div>
          )}
        </div>
      )}

      {state === "error" && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4" />
          {errorMsg}
        </div>
      )}
    </div>
  );
}
