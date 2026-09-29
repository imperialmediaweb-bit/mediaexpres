"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

export function VerificaLink({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/placements/${id}/verifica`, { method: "POST" });
      const j = await r.json();
      setMsg(j.ok ? `${j.stare}: ${j.detalii}` : j.error);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={go} disabled={busy} className="inline-flex items-center gap-1 text-xs font-medium text-brand-navy underline disabled:opacity-50">
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        Verifică acum
      </button>
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
    </span>
  );
}
