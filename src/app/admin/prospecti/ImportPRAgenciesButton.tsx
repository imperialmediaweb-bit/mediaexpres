"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Database, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImportPRAgenciesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function importAll() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/prospects/import", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Eroare");
      setResult({
        imported: data.imported,
        skipped: data.skipped,
        total: data.total,
      });
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={importAll}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Se importa...
          </>
        ) : (
          <>
            <Database className="h-3.5 w-3.5" /> Importa 39 agentii PR Romania
          </>
        )}
      </Button>
      {result && (
        <div className="rounded-md bg-green-50 border border-green-200 p-2 text-xs text-green-800 flex items-start gap-2">
          <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            {result.imported} agentii adaugate
            {result.skipped > 0 ? `, ${result.skipped} existau deja` : ""} (din {result.total}).
          </span>
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
