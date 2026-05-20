"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radar, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ImportedAgency {
  companyName: string;
  email: string;
  website: string;
}

interface Result {
  discovered: number;
  imported: number;
  importedList: ImportedAgency[];
  skipped: string[];
}

export function DiscoverButton() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [count, setCount] = useState(20);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDiscover() {
    if (state === "loading") return;
    setState("loading");
    setResult(null);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/prospects/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim() || undefined,
          city: city.trim() || undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || "Eroare necunoscută");
        setState("error");
        return;
      }
      setResult(data);
      setState("done");
      if (data.imported > 0) router.refresh();
    } catch (e) {
      setErrorMsg(String(e));
      setState("error");
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tip firmă (ex: agenții PR)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
          disabled={state === "loading"}
        />
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Oraș (opțional)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
          disabled={state === "loading"}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-600">Câte caut:</label>
        <select
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          disabled={state === "loading"}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={30}>30</option>
          <option value={40}>40</option>
        </select>
      </div>
      <button
        onClick={handleDiscover}
        disabled={state === "loading"}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {state === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Caut firme + extrag emailuri...
          </>
        ) : (
          <>
            <Radar className="h-4 w-4" />
            Găsește prospecți cu AI
          </>
        )}
      </button>

      {state === "loading" && (
        <p className="text-xs text-slate-500">
          Durează ~30-60 sec — AI găsește firmele, apoi deschid site-ul fiecăreia
          ca să extrag emailul real (nu inventez emailuri).
        </p>
      )}

      {state === "done" && result && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-indigo-800">
            <CheckCircle2 className="h-4 w-4" />
            Găsite {result.discovered} · Importate {result.imported} prospecți noi
          </div>
          {result.importedList.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-indigo-700">
              {result.importedList.map((a, i) => (
                <li key={i}>
                  + <strong>{a.companyName}</strong> — {a.email}
                </li>
              ))}
            </ul>
          )}
          {result.skipped.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-slate-500">
                {result.skipped.length} sărite (click pentru detalii)
              </summary>
              <ul className="mt-1 space-y-0.5 text-slate-500">
                {result.skipped.map((s, i) => (
                  <li key={i}>· {s}</li>
                ))}
              </ul>
            </details>
          )}
          {result.imported > 0 && (
            <p className="mt-2 text-indigo-600">
              Sunt în tab-ul „Noi". Folosește „Auto-pilot" ca să le trimiți pitch-ul AI.
            </p>
          )}
        </div>
      )}

      {state === "error" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}
    </div>
  );
}
