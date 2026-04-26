"use client";

import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Loader2,
  AlertCircle,
  Sparkles,
  Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Month {
  month: number;
  monthName: string;
  theme: string;
  hook: string;
  suggestedFormat: string;
}

const FORMAT_LABELS: Record<string, string> = {
  lansare: "Lansare",
  eveniment: "Eveniment",
  rezultate: "Rezultate",
  extindere: "Extindere",
  altceva: "Anunț",
};

const FORMAT_COLORS: Record<string, string> = {
  lansare: "bg-blue-100 text-blue-800",
  eveniment: "bg-purple-100 text-purple-800",
  rezultate: "bg-green-100 text-green-800",
  extindere: "bg-amber-100 text-amber-800",
  altceva: "bg-slate-100 text-slate-700",
};

export function CalendarClient() {
  const [industry, setIndustry] = useState("");
  const [context, setContext] = useState("");
  const [calendar, setCalendar] = useState<Month[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (industry.trim().length < 2) {
      setError("Spune-ne industria firmei (minim 2 caractere)");
      return;
    }
    setStatus("loading");
    setError(null);
    setCalendar([]);
    try {
      const res = await fetch("/api/generate-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, companyContext: context }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || "Eroare");
      setCalendar(body.calendar);
      setStatus("idle");
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Eroare necunoscuta");
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="space-y-4">
          <div>
            <Label>Industria firmei tale *</Label>
            <Input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Ex: consultanță fiscală, restaurant, e-commerce moda, IT software, real estate"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Context (opțional, dar util)</Label>
            <Textarea
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: 5 ani pe piață, sediul în Cluj, clienți IMM-uri din Transilvania, planificăm să deschidem o filială în 2026"
              className="mt-1.5"
            />
          </div>
          <Button
            type="button"
            variant="accent"
            onClick={generate}
            disabled={status === "loading"}
            size="lg"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> AI gândește...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generează calendarul (12 luni)
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

      {calendar.length > 0 && (
        <div>
          <p className="eyebrow text-brand-red">Calendar editorial 2026</p>
          <h2 className="h2 mt-2">12 teme pentru următoarele 12 luni</h2>
          <p className="mt-2 text-sm text-slate-600">
            Generate pe baza industriei și contextului tău. Poți edita oricând,
            sau click pe „Trimite acest articol” ca să dai start la draft.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {calendar.map((m) => (
              <div
                key={m.month}
                className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-brand-red" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {m.monthName}
                  </span>
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                      FORMAT_COLORS[m.suggestedFormat] || FORMAT_COLORS.altceva
                    }`}
                  >
                    {FORMAT_LABELS[m.suggestedFormat] || "Anunț"}
                  </span>
                </div>

                <h3 className="mt-3 font-serif text-lg font-bold text-brand-navy leading-snug">
                  {m.theme}
                </h3>

                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {m.hook}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                    asChild
                  >
                    <a
                      href={`/cont/articole/nou?prefill=${encodeURIComponent(m.theme)}`}
                    >
                      <span>Trimite în luna {m.monthName}</span>
                      <Send className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
