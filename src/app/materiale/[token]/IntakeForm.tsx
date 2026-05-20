"use client";

import { useState } from "react";
import { STANDARD_PACKAGES } from "@/data/packages";

type ArticleMode = "write" | "ai";

interface FormData {
  firmName: string;
  firmCui: string;
  firmAddress: string;
  firmCity: string;
  firmContactName: string;
  firmContactPhone: string;
  firmInvoiceEmail: string;
  packageId: string;
  region: string;
  county: string;
  articleMode: ArticleMode;
  articleTitle: string;
  articleBody: string;
  articleTopic: string;
}

interface Props {
  token: string;
  leadEmail?: string;
  initialPackage?: string;
  initialRegion?: string;
  initialCounty?: string;
}

export function IntakeForm({
  token,
  leadEmail,
  initialPackage,
  initialRegion,
  initialCounty,
}: Props) {
  const validPkg = ["local", "regional", "national"].includes(initialPackage || "")
    ? (initialPackage as string)
    : "national";

  const [data, setData] = useState<FormData>({
    firmName: "",
    firmCui: "",
    firmAddress: "",
    firmCity: "",
    firmContactName: "",
    firmContactPhone: "",
    firmInvoiceEmail: leadEmail || "",
    packageId: validPkg,
    region: initialRegion || "",
    county: initialCounty || "",
    articleMode: "write",
    articleTitle: "",
    articleBody: "",
    articleTopic: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof FormData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (data.articleMode === "write" && (!data.articleTitle.trim() || !data.articleBody.trim())) {
      setError("Completează titlul și textul articolului.");
      return;
    }
    if (data.articleMode === "ai" && !data.articleTopic.trim()) {
      setError("Descrie tematica articolului.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/materiale/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...data }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Eroare la trimitere");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare neașteptată");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
        <p className="text-4xl">🎉</p>
        <h2 className="mt-4 font-serif text-2xl font-bold text-brand-navy">
          Materialele au fost trimise!
        </h2>
        <p className="mt-3 text-slate-600">
          Publicăm pe 50 de ziare în <strong>24h</strong>. Vei primi raportul PDF cu toate
          link-urile pe emailul de facturare.
        </p>
      </div>
    );
  }

  const selectedPkg = STANDARD_PACKAGES.find((p) => p.id === data.packageId);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow">
        <h2 className="mb-4 font-serif text-lg font-bold text-brand-navy">
          1. Date firmă (pentru factură)
        </h2>
        <div className="space-y-4">
          {[
            { field: "firmName" as const, label: "Denumire firmă", placeholder: "Ex: MediaCom SRL", type: "text" },
            { field: "firmCui" as const, label: "CUI / CIF", placeholder: "Ex: RO12345678", type: "text" },
            { field: "firmAddress" as const, label: "Adresă completă", placeholder: "Ex: Str. Florilor nr. 5, sector 2", type: "text" },
            { field: "firmCity" as const, label: "Oraș", placeholder: "Ex: București", type: "text" },
            { field: "firmContactName" as const, label: "Persoană de contact", placeholder: "Ex: Andrei Popescu", type: "text" },
            { field: "firmContactPhone" as const, label: "Telefon contact", placeholder: "Ex: 0722 123 456", type: "tel" },
            { field: "firmInvoiceEmail" as const, label: "Email facturare", placeholder: "facturi@firma.ro", type: "email" },
          ].map(({ field, label, placeholder, type }) => (
            <div key={field}>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {label} <span className="text-brand-red">*</span>
              </label>
              <input
                type={type}
                required
                value={data[field]}
                onChange={(e) => set(field, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow">
        <h2 className="mb-4 font-serif text-lg font-bold text-brand-navy">2. Pachet ales</h2>

        {(data.region || data.county) && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm">
            <p className="font-semibold text-green-800">✓ Alegerea ta de pe pagina ofertă:</p>
            <p className="mt-1 text-green-700">
              {data.region && <>Regiune: <strong>{data.region}</strong></>}
              {data.county && <>Județ: <strong>{data.county}</strong></>}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {STANDARD_PACKAGES.map((pkg) => (
            <label
              key={pkg.id}
              className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${
                data.packageId === pkg.id
                  ? "border-brand-red bg-red-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="package"
                value={pkg.id}
                checked={data.packageId === pkg.id}
                onChange={() => set("packageId", pkg.id)}
                className="accent-brand-red"
              />
              <div className="flex-1">
                <p className="font-semibold text-brand-navy">
                  {pkg.name}
                  {pkg.badge && (
                    <span className="ml-2 rounded-full bg-brand-red px-2 py-0.5 text-xs text-white">
                      {pkg.badge}
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-500">{pkg.reach}</p>
              </div>
              <p className="font-bold text-brand-red">{pkg.price.toLocaleString("ro")} RON</p>
            </label>
          ))}
        </div>
        {selectedPkg && (
          <p className="mt-3 text-xs text-slate-500">
            Pachetul ales: <strong>{selectedPkg.name}</strong> —{" "}
            {selectedPkg.price.toLocaleString("ro")} RON. Factura se emite după publicare.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow">
        <h2 className="mb-4 font-serif text-lg font-bold text-brand-navy">3. Articolul</h2>
        <div className="mb-4 flex gap-3">
          {(["write", "ai"] as ArticleMode[]).map((mode) => (
            <label
              key={mode}
              className={`flex-1 cursor-pointer rounded-xl border-2 p-3 text-center text-sm font-medium transition ${
                data.articleMode === mode
                  ? "border-brand-red bg-red-50 text-brand-red"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={mode}
                checked={data.articleMode === mode}
                onChange={() => set("articleMode", mode)}
                className="sr-only"
              />
              {mode === "write" ? "✍️ Trimit articolul meu" : "🤖 Scrieți voi cu AI"}
            </label>
          ))}
        </div>

        {data.articleMode === "write" ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Titlu articol <span className="text-brand-red">*</span>
              </label>
              <input
                type="text"
                value={data.articleTitle}
                onChange={(e) => set("articleTitle", e.target.value)}
                placeholder="Ex: Firma noastră lansează serviciul X..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Textul articolului <span className="text-brand-red">*</span>
              </label>
              <textarea
                value={data.articleBody}
                onChange={(e) => set("articleBody", e.target.value)}
                placeholder="Paste articolul complet aici..."
                rows={8}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tematica articolului <span className="text-brand-red">*</span>
            </label>
            <textarea
              value={data.articleTopic}
              onChange={(e) => set("articleTopic", e.target.value)}
              placeholder="Ex: Lansăm o aplicație mobilă pentru management imobiliar. Vrem să prezentăm beneficiile pentru agenții imobiliare din România."
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
            />
            <p className="mt-2 text-xs text-slate-500">
              AI-ul nostru generează un comunicat de presă complet pe baza descrierii tale.
            </p>
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-brand-red py-4 text-lg font-bold text-white shadow-lg transition hover:bg-brand-red/90 disabled:opacity-50"
      >
        {loading ? "Se trimite..." : "Trimite materialele →"}
      </button>

      <p className="text-center text-xs text-slate-500">
        Publicăm în 24h. Factura se emite pe email după publicare.
      </p>
    </form>
  );
}
