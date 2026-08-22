"use client";

import { useState } from "react";
import { Loader2, Sparkles, Upload, X, Star, CheckCircle2 } from "lucide-react";

type Mode = "ai" | "write";

interface UploadedImage {
  url: string;
  publicId?: string;
}

const MAX_IMAGES = 3;

export function ArticleForm({
  token,
  email,
  isCasino,
  newspapers = 50,
}: {
  token: string;
  email: string;
  isCasino: boolean;
  newspapers?: number;
}) {
  const [mode, setMode] = useState<Mode>("ai");

  const [companyName, setCompanyName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [brief, setBrief] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [generatedByAi, setGeneratedByAi] = useState(false);

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [facebookOptIn, setFacebookOptIn] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function generate() {
    if (generating) return;
    setError(null);
    setNotice(null);
    if (brief.trim().length < 20) {
      setError("Scrie câteva propoziții despre ce vrei să comunici (minim 20 de caractere).");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/articol/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, brief, companyName, siteUrl }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Generarea a eșuat");

      setTitle(json.article.title);
      setBody(json.article.body);
      setMetaDescription(json.article.metaDescription || "");
      setKeywords(json.article.keywords || []);
      setGeneratedByAi(true);
      setNotice(
        json.siteRead
          ? "Am citit site-ul și am scris articolul. Verifică-l și editează ce vrei."
          : "Am scris articolul din descrierea ta. (Site-ul nu a putut fi citit.) Verifică-l înainte de trimitere.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generarea a eșuat");
    } finally {
      setGenerating(false);
    }
  }

  async function uploadFiles(files: FileList) {
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setError(`Poți încărca maximum ${MAX_IMAGES} poze.`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const signRes = await fetch("/api/articol/upload-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const sign = await signRes.json();
      if (!signRes.ok || !sign.ok) throw new Error(sign.error || "Upload indisponibil");

      const picked = Array.from(files).slice(0, room);
      const uploaded: UploadedImage[] = [];

      for (const file of picked) {
        if (!file.type.startsWith("image/")) continue;
        const form = new FormData();
        form.append("file", file);
        form.append("api_key", sign.apiKey);
        form.append("timestamp", String(sign.timestamp));
        form.append("folder", sign.folder);
        form.append("signature", sign.signature);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
          { method: "POST", body: form },
        );
        const json = await res.json();
        if (!res.ok || !json.secure_url) {
          throw new Error(json?.error?.message || "Încărcarea unei poze a eșuat");
        }
        uploaded.push({ url: json.secure_url, publicId: json.public_id });
      }

      if (uploaded.length) setImages((prev) => [...prev, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Încărcarea a eșuat");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    setFeaturedIndex((prev) => {
      if (i === prev) return 0;
      return i < prev ? prev - 1 : prev;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (title.trim().length < 5) {
      setError("Articolul are nevoie de un titlu.");
      return;
    }
    if (body.trim().length < 100) {
      setError("Textul articolului e prea scurt (minim 100 de caractere).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/articol/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          title,
          body,
          companyName,
          siteUrl,
          contactPhone,
          metaDescription,
          keywords,
          images,
          featuredIndex,
          facebookOptIn,
          generatedByAi,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Trimiterea a eșuat");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trimiterea a eșuat");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <h2 className="mt-4 font-serif text-2xl font-bold text-brand-navy">
          Materialele au ajuns la noi
        </h2>
        <p className="mt-3 text-slate-600">
          Publicăm pe {newspapers === 1
            ? "publicația din pachetul tău"
            : `cele ${newspapers}${newspapers >= 20 ? " de" : ""} publicații`} în
          maximum <strong>24 de ore lucrătoare</strong>. Primești raportul cu
          toate linkurile pe <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {isCasino && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Conținut iGaming declarat.</strong> Articolul va include
          automat mențiunile obligatorii ONJN și 18+ / joc responsabil.
        </div>
      )}

      {/* 1. Date firma */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-serif text-lg font-bold text-brand-navy">
          1. Despre firma ta
        </h2>
        <div className="space-y-4">
          <Field
            label="Numele firmei"
            value={companyName}
            onChange={setCompanyName}
            placeholder="Ex: MediaCom SRL"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Site-ul firmei
            </label>
            <input
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="firma.ro"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Îl citim ca să scriem articolul cu informații reale despre tine.
            </p>
          </div>
          <Field
            label="Telefon de contact"
            value={contactPhone}
            onChange={setContactPhone}
            placeholder="07XX XXX XXX"
            type="tel"
          />
        </div>
      </section>

      {/* 2. Articolul */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-serif text-lg font-bold text-brand-navy">
          2. Articolul
        </h2>

        <div className="mb-5 flex gap-3">
          {(
            [
              ["ai", "🤖 Scrieți voi"],
              ["write", "✍️ Am textul meu"],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <label
              key={m}
              className={`flex-1 cursor-pointer rounded-xl border-2 p-3 text-center text-sm font-medium transition ${
                mode === m
                  ? "border-brand-red bg-red-50 text-brand-red"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="mode"
                checked={mode === m}
                onChange={() => setMode(m)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>

        {mode === "ai" && (
          <div className="mb-5 rounded-xl bg-slate-50 p-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Ce vrei să comunici?
            </label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              placeholder="Ex: Lansăm un serviciu de curățenie pentru birouri în Cluj. Suntem singurii cu produse ecologice certificate și lucrăm și în weekend."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
            />
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-navy/90 disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Citim site-ul și scriem...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {title ? "Generează din nou" : "Scrie articolul"}
                </>
              )}
            </button>
          </div>
        )}

        {notice && (
          <p className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
            {notice}
          </p>
        )}

        <div className="space-y-4">
          <Field
            label="Titlu articol"
            value={title}
            onChange={setTitle}
            placeholder="Titlul care apare în ziare"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Textul articolului
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder={
                mode === "ai"
                  ? "Aici apare articolul generat. Îl poți edita liber."
                  : "Lipește articolul complet aici..."
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm leading-relaxed focus:border-brand-red focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              {body.trim() ? `${body.trim().split(/\s+/).length} cuvinte` : "Minim 100 de caractere"}
            </p>
          </div>

          {keywords.length > 0 && (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Cuvinte-cheie SEO
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Poze */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-serif text-lg font-bold text-brand-navy">
          3. Poze <span className="text-sm font-normal text-slate-500">({images.length}/{MAX_IMAGES})</span>
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Alege una ca <strong>imagine reprezentativă</strong> — aia apare pe
          prima pagină și pe Facebook.
        </p>

        {images.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {images.map((img, i) => (
              <div
                key={img.url}
                className={`relative overflow-hidden rounded-xl border-2 ${
                  i === featuredIndex ? "border-brand-red" : "border-slate-200"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`Poza ${i + 1}`}
                  className="h-32 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                  aria-label="Șterge poza"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFeaturedIndex(i)}
                  className={`flex w-full items-center justify-center gap-1 py-1.5 text-xs font-semibold transition ${
                    i === featuredIndex
                      ? "bg-brand-red text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Star
                    className={`h-3 w-3 ${i === featuredIndex ? "fill-current" : ""}`}
                  />
                  {i === featuredIndex ? "Reprezentativă" : "Alege"}
                </button>
              </div>
            ))}
          </div>
        )}

        {images.length < MAX_IMAGES && (
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 transition hover:border-brand-red hover:bg-red-50/40">
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files?.length) uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-brand-red" />
                <span className="mt-2 text-sm text-slate-600">Se încarcă...</span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-slate-400" />
                <span className="mt-2 text-sm font-medium text-slate-700">
                  Încarcă poze
                </span>
                <span className="mt-0.5 text-xs text-slate-500">
                  JPG sau PNG • încă {MAX_IMAGES - images.length} disponibile
                </span>
              </>
            )}
          </label>
        )}
      </section>

      {/* 4. Facebook */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={facebookOptIn}
            onChange={(e) => setFacebookOptIn(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand-red"
          />
          <span>
            <strong className="text-brand-navy">
              Distribuie articolul și pe paginile de Facebook
            </strong>
            <span className="mt-1 block text-sm text-slate-600">
              Cele 50 de publicații au pagini de Facebook cu 300–10.000 de
              urmăritori. Inclus, fără cost suplimentar. Poți refuza dacă
              preferi doar publicarea pe site.
            </span>
          </span>
        </label>
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-red py-4 text-lg font-bold text-white shadow-lg transition hover:bg-brand-red/90 disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Se trimite...
          </>
        ) : (
          "Trimite materialele →"
        )}
      </button>

      <p className="text-center text-xs text-slate-500">
        Publicăm în maximum 24 de ore lucrătoare de la primire.
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
      />
    </div>
  );
}
