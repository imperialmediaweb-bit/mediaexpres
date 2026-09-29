"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Clientul prefera banii in locul publicatiei inlocuitoare. */
export function CerereRamburs({ token, placementId, suma }: { token: string; placementId: string; suma: number }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function trimite() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/comanda-mea/ramburs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, p: placementId }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Cererea n-a plecat.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cererea n-a plecat.");
    } finally {
      setBusy(false);
    }
  }

  if (!confirm) {
    return (
      <button type="button" onClick={() => setConfirm(true)} className="text-xs font-medium text-slate-600 underline hover:text-brand-red">
        Prefer banii înapoi în locul acestei publicații
      </button>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <p>
        Oprim publicarea aici și îți returnăm <strong>{suma} lei</strong> pe card. Sigur?
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={trimite} disabled={busy} className="inline-flex items-center gap-1 rounded-md bg-brand-red px-3 py-1.5 font-semibold text-white disabled:opacity-50">
          {busy && <Loader2 className="h-3 w-3 animate-spin" />} Da, vreau banii înapoi
        </button>
        <button type="button" onClick={() => setConfirm(false)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5">
          Nu, rămâne așa
        </button>
      </div>
      {err && <p className="mt-2 text-red-700">{err}</p>}
    </div>
  );
}
