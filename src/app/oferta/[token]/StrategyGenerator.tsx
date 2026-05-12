"use client";

import { useState } from "react";
import {
  Sparkles,
  Rocket,
  Calendar,
  Lightbulb,
  Package,
  Repeat,
  Loader2,
  ArrowRight,
  Wand2,
  TrendingUp,
  Award,
  Megaphone,
  Handshake,
  Building2,
  Trophy,
  BookOpen,
  AlertCircle,
} from "lucide-react";

interface Idea {
  title: string;
  type: string;
  month: string;
  whyItWorks: string;
}

interface Strategy {
  brandSnapshot: string;
  ideas: Idea[];
  recommendedPackage: string;
  recommendedPackageReason: string;
  recommendedFrequency: string;
  recommendedFrequencyReason: string;
}

interface Props {
  prospectCompany?: string;
  prospectIndustry?: string;
  prospectCity?: string;
  actionHref?: string;
  actionLabel?: string;
}

const TYPE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  lansare: { label: "Lansare", icon: Rocket, color: "bg-rose-100 text-rose-700" },
  eveniment: { label: "Eveniment", icon: Megaphone, color: "bg-purple-100 text-purple-700" },
  parteneriat: { label: "Parteneriat", icon: Handshake, color: "bg-blue-100 text-blue-700" },
  rezultate: { label: "Rezultate", icon: TrendingUp, color: "bg-emerald-100 text-emerald-700" },
  extindere: { label: "Extindere", icon: Building2, color: "bg-amber-100 text-amber-700" },
  premii: { label: "Premiu", icon: Trophy, color: "bg-yellow-100 text-yellow-700" },
  educational: { label: "Educational", icon: BookOpen, color: "bg-cyan-100 text-cyan-700" },
  announcement: { label: "Anunt", icon: Award, color: "bg-slate-100 text-slate-700" },
};

export function StrategyGenerator({
  prospectCompany,
  prospectIndustry,
  prospectCity,
  actionHref = "#pachet-recomandat",
  actionLabel = "Vezi pachetul recomandat",
}: Props) {
  const [brandInput, setBrandInput] = useState(prospectCompany || "");
  const [briefDescription, setBriefDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  async function generate() {
    if (brandInput.trim().length < 2) {
      setError("Introdu site-ul sau numele brand-ului (minim 2 caractere)");
      return;
    }
    setLoading(true);
    setError(null);
    setStrategy(null);
    setLoadingStep(0);

    const stepTimer = setInterval(() => {
      setLoadingStep((s) => (s < 3 ? s + 1 : s));
    }, 1500);

    try {
      const res = await fetch("/api/advisor/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandInput: brandInput.trim(),
          briefDescription: briefDescription.trim() || undefined,
          prospectCompany,
          prospectIndustry,
          prospectCity,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Eroare server");
      }
      setStrategy(data.strategy);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "eroare necunoscuta";
      setError(
        `Imi pare rau, am o problema tehnica acum (${msg}). Scrieti-ne la contact@mediaexpress.ro si va trimitem strategia in 24h.`
      );
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-amber-50/30 to-rose-50/30 py-16 md:py-20">
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-rose-200/40 blur-3xl" />

      <div className="container relative max-w-5xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-red to-amber-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
            <Sparkles className="h-4 w-4" />
            Exclusiv MediaExpres
          </div>
          <h2 className="mt-5 font-serif text-3xl md:text-5xl font-bold text-brand-navy leading-tight">
            Strateg Editorial AI
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Dai site-ul sau brandul vostru. Iti generam in 30 secunde o strategie editoriala
            completa: <strong>5 idei de articole tailored</strong>, pachetul potrivit din
            reteaua noastra de 50 publicatii, plus frecventa optima pentru voi.
          </p>
        </div>

        {!strategy && (
          <div className="mt-10 rounded-3xl border-2 border-slate-200 bg-white p-8 md:p-10 shadow-xl">
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-brand-navy block mb-2">
                  Site-ul vostru sau numele brandului{" "}
                  <span className="text-brand-red">*</span>
                </label>
                <input
                  value={brandInput}
                  onChange={(e) => setBrandInput(e.target.value)}
                  placeholder="ex: dentcluj.ro  /  Cabinet Stomatologic Dr. Popescu  /  florarie-bucuresti.ro"
                  disabled={loading}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-base focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 disabled:opacity-50 transition"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-brand-navy block mb-2">
                  Descriere scurta a brandului{" "}
                  <span className="text-slate-400 font-normal">(opt - 1-2 propozitii)</span>
                </label>
                <textarea
                  value={briefDescription}
                  onChange={(e) => setBriefDescription(e.target.value)}
                  rows={3}
                  placeholder="ex: Vindem cosmetice naturale handmade catre femei 25-45 ani, magazin online cu livrare nationala. Target principal: clienti urbani."
                  disabled={loading}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-base focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 disabled:opacity-50 transition resize-none"
                />
              </div>

              <button
                onClick={generate}
                disabled={loading || brandInput.trim().length < 2}
                className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-brand-red to-amber-500 px-8 py-4 text-base font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Construiesc strategia ta...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" />
                    Genereaza strategie editoriala
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              {loading && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <LoadingStep done={loadingStep >= 1} text="Analizez brandul vostru..." />
                  <LoadingStep done={loadingStep >= 2} text="Generez 5 idei de articole personalizate..." />
                  <LoadingStep done={loadingStep >= 3} text="Calculez pachetul si frecventa optima..." />
                </div>
              )}

              {error && (
                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              Powered by Strategul nostru editorial • raspuns 100% bazat pe reteaua MediaExpres
            </p>
          </div>
        )}

        {strategy && (
          <div className="mt-10 space-y-6">
            <div className="rounded-3xl border-2 border-brand-navy bg-brand-navy p-8 text-white shadow-xl">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gold/20">
                  <Lightbulb className="h-6 w-6 text-brand-gold" />
                </div>
                <div className="flex-1">
                  <p className="eyebrow text-brand-gold">Analiza brand</p>
                  <p className="mt-2 text-lg leading-relaxed text-white/90">
                    {strategy.brandSnapshot}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-red text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold text-brand-navy">
                    5 idei de articole pentru voi
                  </h3>
                  <p className="text-sm text-slate-500">
                    Personalizate pentru brandul vostru, programate pe sezonalitate
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {strategy.ideas.map((idea, i) => {
                  const meta = TYPE_META[idea.type] || TYPE_META.announcement;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={i}
                      className="group rounded-2xl border-2 border-slate-200 bg-white p-5 hover:border-brand-red hover:shadow-lg transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.color}`}
                        >
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {idea.month}
                        </span>
                      </div>
                      <h4 className="mt-3 font-serif text-base font-bold text-brand-navy leading-snug">
                        {idea.title}
                      </h4>
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                          De ce prinde
                        </p>
                        <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                          {idea.whyItWorks}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-brand-red bg-gradient-to-br from-rose-50 to-amber-50 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-red text-white shadow-lg">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-bold text-brand-red">
                      Pachet recomandat
                    </p>
                    <p className="font-serif text-xl font-bold text-brand-navy">
                      {strategy.recommendedPackage}
                    </p>
                  </div>
                </div>
                {strategy.recommendedPackageReason && (
                  <p className="mt-4 text-sm text-slate-700 leading-relaxed">
                    {strategy.recommendedPackageReason}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border-2 border-brand-navy bg-gradient-to-br from-blue-50 to-slate-50 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy text-white shadow-lg">
                    <Repeat className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-bold text-brand-navy">
                      Frecventa recomandata
                    </p>
                    <p className="font-serif text-xl font-bold text-brand-navy">
                      {strategy.recommendedFrequency}
                    </p>
                  </div>
                </div>
                {strategy.recommendedFrequencyReason && (
                  <p className="mt-4 text-sm text-slate-700 leading-relaxed">
                    {strategy.recommendedFrequencyReason}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  setStrategy(null);
                  setBriefDescription("");
                  setError(null);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Wand2 className="h-4 w-4" />
                Genereaza alta strategie
              </button>
              <a
                href={actionHref}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-red to-amber-500 px-6 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition"
              >
                {actionLabel}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <p className="text-center text-xs text-slate-500 pt-2">
              Strategia generata e doar pentru voi. Salveaza pagina sau printeaza ca PDF pentru
              echipa interna. Daca alegi un pachet, agentul nostru te ajuta sa scrii primul
              articol din lista de mai sus.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function LoadingStep({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3">
      {done ? (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ) : (
        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
        </div>
      )}
      <p
        className={`text-sm ${
          done ? "text-slate-700 font-medium" : "text-slate-500"
        }`}
      >
        {text}
      </p>
    </div>
  );
}
