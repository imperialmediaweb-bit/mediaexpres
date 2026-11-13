"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TrimiteVoucher({ afiliatId, suma }: { afiliatId: number; suma: number }) {
  const router = useRouter();
  const [cod, setCod] = useState("");
  const [lei, setLei] = useState(String(suma));
  const [stare, setStare] = useState<"" | "trimit" | "ok" | string>("");

  async function trimite() {
    setStare("trimit");
    const r = await fetch("/api/admin/afiliati/voucher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ afiliatId, cod, suma: Number(lei) }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) {
      setStare("ok");
      router.refresh();
    } else setStare(j.error || `Eroare ${r.status}`);
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input className="w-64 rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="Codul voucherului eMAG" value={cod} onChange={(e) => setCod(e.target.value)} />
      <input className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm" type="number" min={1} value={lei} onChange={(e) => setLei(e.target.value)} />
      <span className="text-sm text-slate-500">lei</span>
      <button disabled={stare === "trimit" || cod.trim().length < 4} onClick={trimite} className="rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
        {stare === "trimit" ? "Se trimite…" : "Trimite pe email"}
      </button>
      {stare === "ok" && <span className="text-sm text-green-700">Trimis ✓</span>}
      {stare && stare !== "ok" && stare !== "trimit" && <span className="text-sm text-red-600">{stare}</span>}
    </div>
  );
}
