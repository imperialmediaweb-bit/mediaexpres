"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, X, Link2 } from "lucide-react";

/**
 * Butoanele publicatiei partenere. Serverul verifica din nou fiecare
 * tranzitie: pagina poate fi deschisa de ieri, iar starea reala e in baza.
 */
export function PlacementActions({
  token,
  status,
  poateRefuza,
}: {
  token: string;
  status: string;
  poateRefuza: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [motiv, setMotiv] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function trimite(action: "accept" | "refuz" | "publicat", extra: Record<string, unknown> = {}) {
    setBusy(action);
    setErr(null);
    try {
      const r = await fetch(`/api/placements/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Eroare");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      {status === "trimis" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="font-semibold text-brand-navy">Îl publici?</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => trimite("accept")}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red/90 disabled:opacity-60"
            >
              {busy === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Da, îl public
            </button>
          </div>

          {poateRefuza && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <label className="text-sm text-slate-700">
                Sau refuză-l. Motivul e opțional — nu trebuie să explici.
              </label>
              <input
                value={motiv}
                onChange={(e) => setMotiv(e.target.value)}
                placeholder="Motiv (opțional)"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => trimite("refuz", { reason: motiv || undefined })}
                disabled={busy !== null}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-red-400 hover:text-red-600 disabled:opacity-60"
              >
                {busy === "refuz" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Refuz articolul
              </button>
            </div>
          )}
        </div>
      )}

      {status === "acceptat" && (
        <div className="rounded-xl border-2 border-brand-red/30 bg-white p-5">
          <p className="font-semibold text-brand-navy">Ai publicat? Lipește adresa articolului.</p>
          <p className="mt-1 text-xs text-slate-500">
            De aici o luăm în raportul clientului. Fără ea, articolul nu se consideră livrat și nu se plătește.
          </p>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://ziarul.ro/articolul-publicat"
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => trimite("publicat", { url: url.trim() })}
            disabled={busy !== null || !/^https?:\/\/.+\..+/.test(url.trim())}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red/90 disabled:opacity-60"
          >
            {busy === "publicat" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Trimite adresa
          </button>
        </div>
      )}

      {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
    </div>
  );
}
