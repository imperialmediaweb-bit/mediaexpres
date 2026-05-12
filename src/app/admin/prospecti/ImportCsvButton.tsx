"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Check, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const EXAMPLE = `companyName,email,contactName,industry,city,website,notes
Dent Estet,office@dentestet.ro,Dr. Popescu,Clinica stomatologica,Bucuresti,https://dentestet.ro,Chain mare 15+ locatii
Smile Center,contact@smilecenter.ro,,Clinica stomatologica,Cluj-Napoca,https://smilecenter.ro,
Pure Goose,hello@puregoose.ro,Maria Ionescu,Magazin online cosmetice naturale,Bucuresti,https://puregoose.ro,D2C beauty brand`;

interface ImportResult {
  imported: number;
  duplicate: number;
  skipped: number;
  total: number;
  skippedReasons?: Array<{ rowIndex: number; reason: string }>;
}

export function ImportCsvButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [industryDefault, setIndustryDefault] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runImport() {
    if (!csv.trim()) {
      setError("Lipiți CSV-ul în caseta de mai sus.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/prospects/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv,
          industryDefault: industryDefault.trim() || undefined,
        }),
      });
      const raw = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Server non-JSON (HTTP ${res.status}): ${raw.slice(0, 150)}`);
      }
      const json = data as {
        ok?: boolean;
        error?: string;
        imported?: number;
        duplicate?: number;
        skipped?: number;
        total?: number;
        skippedReasons?: Array<{ rowIndex: number; reason: string }>;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Eroare HTTP ${res.status}`);
      }
      setResult({
        imported: json.imported ?? 0,
        duplicate: json.duplicate ?? 0,
        skipped: json.skipped ?? 0,
        total: json.total ?? 0,
        skippedReasons: json.skippedReasons,
      });
      if ((json.imported ?? 0) > 0) {
        setCsv("");
        router.refresh();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <Upload className="h-3.5 w-3.5" /> Deschide CSV import
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-700">
          Industrie default (opțional)
        </label>
        <input
          type="text"
          value={industryDefault}
          onChange={(e) => setIndustryDefault(e.target.value)}
          placeholder="Ex: Clinica stomatologica"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
          disabled={loading}
        />
        <p className="mt-1 text-[10px] text-slate-500">
          Folosit pentru rândurile fără coloana &quot;industry&quot;.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-700">
          Lipește CSV (header pe primul rând):
        </label>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={EXAMPLE}
          rows={8}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-xs font-mono"
          disabled={loading}
        />
        <p className="mt-1 text-[10px] text-slate-500">
          Coloane obligatorii: <code>companyName</code>, <code>email</code>.
          Opționale: contactName, industry, city, website, phone, notes.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="accent"
          size="sm"
          className="flex-1"
          onClick={runImport}
          disabled={loading || !csv.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Import…
            </>
          ) : (
            <>
              <FileText className="h-3.5 w-3.5" /> Import CSV
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setResult(null);
            setError(null);
          }}
          disabled={loading}
        >
          Anulează
        </Button>
      </div>

      {result && (
        <div className="space-y-1 rounded-md bg-green-50 border border-green-200 p-3 text-xs text-green-900">
          <div className="flex items-start gap-2 font-semibold">
            <Check className="h-4 w-4 mt-0.5 shrink-0" />
            Import gata
          </div>
          <ul className="ml-6 list-disc space-y-0.5">
            <li>{result.imported} prospecți nou-adăugați</li>
            <li>{result.duplicate} duplicate (email deja în listă)</li>
            {result.skipped > 0 && (
              <li className="text-red-700">
                {result.skipped} rânduri sărite (date invalide)
              </li>
            )}
            <li className="text-slate-600">{result.total} rânduri în CSV</li>
          </ul>
          {result.skippedReasons && result.skippedReasons.length > 0 && (
            <details className="mt-2 text-red-700">
              <summary className="cursor-pointer font-semibold">
                Vezi rânduri sărite
              </summary>
              <ul className="mt-1 ml-4 space-y-0.5">
                {result.skippedReasons.map((s, i) => (
                  <li key={i} className="text-[11px]">
                    Rând {s.rowIndex}: {s.reason}
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
    </div>
  );
}
