"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkPublishedButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function mark() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/materiale/${id}`, { method: "PATCH" });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Eroare");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Eroare");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={mark}
      disabled={busy}
      className="rounded-lg bg-brand-navy px-4 py-2 text-xs font-semibold text-white hover:bg-brand-navy/90 disabled:opacity-50"
    >
      {busy ? "..." : "Marchează publicat"}
    </button>
  );
}
