"use client";

import { useState } from "react";
import { Search, Loader2, AlertCircle, TrendingUp, TrendingDown, Newspaper, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
}

interface Audit {
  totalLast30Days: number;
  totalLast6Months: number;
  totalAll: number;
  recent: NewsItem[];
  uniqueSources: number;
}

function verdict(last30: number): { label: string; tone: "good" | "warn" | "bad"; recommendation: string } {
  if (last30 >= 5) {
    return {
      label: "Vizibilitate bună",
      tone: "good",
      recommendation:
        "Apari constant în media. Continuă cu un calendar editorial AI ca să rămâi consistent.",
    };
  }
  if (last30 >= 1) {
    return {
      label: "Prezență minimă",
      tone: "warn",
      recommendation:
        "Apari ocazional. Cu 1 articol/lună pe rețeaua noastră (Local 150 RON), poți crește la 5+ menționări/lună stabil.",
    };
  }
  return {
    label: "Lipsă din presă",
    tone: "bad",
    recommendation:
      "Concurenții tăi sigur apar. Un singur articol Național 50 (1500 RON) îți dă 50 de menționări instant + autoritate SEO.",
  };
}

const TONE_COLORS: Record<"good" | "warn" | "bad", string> = {
  good: "bg-green-50 border-green-200 text-green-900",
  warn: "bg-amber-50 border-amber-200 text-amber-900",
  bad: "bg-red-50 border-red-200 text-red-900",
};

export function AuditClient() {
  const [companyName, setCompanyName] = useState("");
  const [audit, setAudit] = useState<Audit | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (companyName.trim().length < 2) {
      setError("Pune numele firmei (minim 2 caractere)");
      return;
    }
    setStatus("loading");
    setError(null);
    setAudit(null);
    try {
      const res = await fetch("/api/audit-mentiuni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || "Eroare");
      setAudit(body.audit);
      setStatus("idle");
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    }
  }

  const v = audit ? verdict(audit.totalLast30Days) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="space-y-3">
          <div>
            <Label>Numele firmei tale *</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: SC Exemplu SRL sau marca ta comercială"
              className="mt-1.5"
              onKeyDown={(e) => {
                if (e.key === "Enter") run();
              }}
            />
          </div>
          <Button
            type="button"
            variant="accent"
            size="lg"
            onClick={run}
            disabled={status === "loading"}
            className="w-full sm:w-auto"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifică în Google News...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" /> Verifică gratuit
              </>
            )}
          </Button>
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {audit && v && (
        <>
          <div className={`rounded-2xl border p-6 ${TONE_COLORS[v.tone]}`}>
            <div className="flex items-center gap-2">
              {v.tone === "good" ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              <h3 className="font-serif text-xl font-bold">{v.label}</h3>
            </div>
            <p className="mt-3 text-sm">{v.recommendation}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Menționări ultima lună" value={audit.totalLast30Days} accent />
            <Stat label="Ultimele 6 luni" value={audit.totalLast6Months} />
            <Stat label="Surse diferite" value={audit.uniqueSources} />
          </div>

          {audit.recent.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-serif text-lg font-bold text-brand-navy flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-brand-red" />
                Ultimele {audit.recent.length} apariții găsite
              </h3>
              <ul className="mt-4 space-y-3">
                {audit.recent.map((item, i) => (
                  <li
                    key={i}
                    className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0"
                  >
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-brand-navy hover:text-brand-red flex items-start gap-2"
                    >
                      <span className="flex-1">{item.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-1" />
                    </a>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.source}
                      {item.publishedAt &&
                        ` • ${new Date(item.publishedAt).toLocaleDateString("ro-RO")}`}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {audit.totalAll === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              <p className="font-semibold">N-am găsit nicio menționare publică.</p>
              <p className="mt-1">
                Asta poate însemna 2 lucruri: fie firma e foarte nouă, fie n-ai investit
                niciodată în PR. Cu un singur articol Național (1500 RON) îți creezi
                instant 50 de menționări online + autoritate SEO.
              </p>
            </div>
          )}

          <div className="rounded-2xl bg-brand-navy p-6 md:p-8 text-white">
            <h3 className="font-serif text-2xl font-bold">
              Vrei să crești prezența în presă?
            </h3>
            <p className="mt-2 text-sm text-white/80">
              Cu MediaExpres, articolul tău apare instant pe rețeaua noastră — toate
              link-urile rămân indexate de Google News pe termen lung.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="gold" size="lg" asChild>
                <Link href="/pachete">Vezi pachetele</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="border-white/40 text-white hover:bg-white hover:text-brand-navy"
              >
                <Link href="/generator-comunicat">Generator comunicat AI gratuit</Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        accent ? "border-brand-red/30 bg-brand-red/5" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-bold text-brand-navy">{value}</p>
    </div>
  );
}
