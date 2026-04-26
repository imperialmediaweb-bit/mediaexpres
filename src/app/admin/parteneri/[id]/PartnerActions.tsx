"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function PartnerActions({
  publisherId,
  currentStatus,
}: {
  publisherId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState<null | "approve" | "reject">(null);
  const [error, setError] = useState<string | null>(null);

  async function call(action: "approve" | "reject") {
    setError(null);
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/publishers/${publisherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: action === "reject" ? reason : undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Eroare");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    } finally {
      setLoading(null);
    }
  }

  if (currentStatus !== "pending") {
    return (
      <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
        Aplicația a fost deja decisă (status: <strong>{currentStatus}</strong>).
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-green-200 bg-white p-5">
        <h3 className="font-serif text-lg font-semibold text-brand-navy flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Aprobă aplicația
        </h3>
        <p className="mt-1 text-xs text-slate-500">Trimite email de bun-venit cu pașii următori.</p>
        <Button type="button" variant="accent" className="mt-4" onClick={() => call("approve")} disabled={loading !== null}>
          {loading === "approve" ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Se aprobă...</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" /> Aprobă</>
          )}
        </Button>
      </div>

      <div className="rounded-xl border border-red-200 bg-white p-5">
        <h3 className="font-serif text-lg font-semibold text-brand-navy flex items-center gap-2">
          <X className="h-5 w-5 text-red-600" />
          Respinge
        </h3>
        <div className="mt-3 space-y-1.5">
          <Label>Motiv (opțional)</Label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: trafic prea scăzut, site nu e activ, nu corespunde temei noastre"
          />
        </div>
        <Button type="button" variant="outline" className="mt-4" onClick={() => call("reject")} disabled={loading !== null}>
          {loading === "reject" ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Se respinge...</>
          ) : (
            <><X className="h-4 w-4" /> Respinge</>
          )}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 rounded-md bg-red-50 p-3">{error}</p>}
    </div>
  );
}
