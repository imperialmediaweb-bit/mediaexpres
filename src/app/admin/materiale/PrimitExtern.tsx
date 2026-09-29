"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** „Primit pe WhatsApp": materialul a venit pe alta cale — comanda iese din lista si din reamintiri. */
export function PrimitExtern({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!confirm("Ai primit materialele pe WhatsApp sau pe email? Comanda iese din listă și nu mai primește reamintiri.")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/orders/${orderId}/primit-extern`, { method: "POST" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Eroare");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-lg border border-emerald-600 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
    >
      {busy && <Loader2 className="h-3 w-3 animate-spin" />} Primit pe WhatsApp
    </button>
  );
}
