"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap, Check, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BatchSendResult {
  total: number;
  sent: number;
  failed: number;
  followUpsScheduled: number;
  errors?: Array<{ id: string; companyName: string; error: string }>;
}

export function BatchSendButton({ availableForBatch }: { availableForBatch: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchSendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(30);

  async function runBatch() {
    if (availableForBatch === 0) {
      setError("Niciun prospect 'new' pentru batch send");
      return;
    }

    const target = Math.min(batchSize, availableForBatch);
    if (
      !confirm(
        `Auto-trimit la ${target} prospecți 'new':\n` +
          `- AI generează email pentru fiecare\n` +
          `- Resend trimite imediat\n` +
          `- Follow-up programat automat pentru 5 zile\n` +
          `- Cost estimat: ~$${(target * 0.003).toFixed(2)}\n\n` +
          `Continui?`
      )
    ) {
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/prospects/batch-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: target }),
      });

      // Citim răspunsul mai întâi ca text — dacă server-ul returnează HTML
      // (deploy in progress, 500 unhandled, etc), JSON.parse aruncă generic
      // "Unexpected token '<'". Cu text raw în hand putem arăta status code
      // + un snippet din eroare ca user-ul să înțeleagă ce s-a întâmplat.
      const raw = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        const snippet = raw.slice(0, 200).replace(/\s+/g, " ").trim();
        throw new Error(
          `Server returned non-JSON (HTTP ${res.status}). ${snippet || "Încearcă din nou în 30 sec dacă deploy-ul e în desfășurare."}`
        );
      }

      const json = data as {
        ok?: boolean;
        error?: string;
        total?: number;
        sent?: number;
        failed?: number;
        followUpsScheduled?: number;
        errors?: Array<{ id: string; companyName: string; error: string }>;
      };

      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Eroare (HTTP ${res.status})`);
      }
      setResult({
        total: json.total ?? 0,
        sent: json.sent ?? 0,
        failed: json.failed ?? 0,
        followUpsScheduled: json.followUpsScheduled ?? 0,
        errors: json.errors,
      });
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-700">Câți:</label>
        <input
          type="number"
          min={1}
          max={50}
          value={batchSize}
          onChange={(e) => setBatchSize(parseInt(e.target.value) || 30)}
          className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
          disabled={loading}
        />
        <span className="text-xs text-slate-500">
          (max 50, există {availableForBatch} &quot;new&quot;)
        </span>
      </div>

      <Button
        type="button"
        variant="accent"
        size="sm"
        className="w-full"
        onClick={runBatch}
        disabled={loading || availableForBatch === 0}
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Trimit batch (≈{batchSize}×3s)...
          </>
        ) : (
          <>
            <Zap className="h-3.5 w-3.5" /> Auto-trimite{" "}
            {Math.min(batchSize, availableForBatch)} acum
          </>
        )}
      </Button>

      {result && (
        <div className="space-y-2 rounded-md bg-green-50 border border-green-200 p-3 text-xs text-green-900">
          <div className="flex items-start gap-2 font-semibold">
            <Check className="h-4 w-4 mt-0.5 shrink-0" />
            Batch terminat
          </div>
          <ul className="space-y-1 ml-6 list-disc">
            <li>{result.sent} emailuri trimise cu succes</li>
            <li>{result.followUpsScheduled} follow-up-uri programate la 5 zile</li>
            {result.failed > 0 && (
              <li className="text-red-700">{result.failed} eșuate</li>
            )}
          </ul>
          {result.errors && result.errors.length > 0 && (
            <details className="mt-2 text-red-700">
              <summary className="cursor-pointer font-semibold">Vezi erori</summary>
              <ul className="mt-1 ml-4 space-y-1">
                {result.errors.map((e) => (
                  <li key={e.id} className="text-xs">
                    <strong>{e.companyName}</strong>: {e.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[10px] text-slate-500 leading-relaxed">
        <Send className="h-3 w-3 mt-0.5 shrink-0" />
        <span>
          AI generează pitch personalizat → Resend trimite → status devine
          „contactați” → follow-up programat automat în 5 zile.
        </span>
      </p>
    </div>
  );
}
