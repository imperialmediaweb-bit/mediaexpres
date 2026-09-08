"use client";

import { useState } from "react";
import { CheckCircle2, Star } from "lucide-react";

/*
  Formularul de recenzie, deschis din emailul cu raportul.

  Doua decizii care tin de rata de completare, nu de estetica:
  - stelele pornesc de la 5. Cine deschide linkul e, statistic, multumit; daca
    nu e, coboara singur. Un formular gol cere un click in plus de la toata
    lumea, ca sa prinda exceptia.
  - numele afisat e camp separat de email. Clientul poate vrea sa apara cu
    firma, nu cu numele lui — proprietarul a cerut asta explicit, ca sa nu
    ghicim noi ce punem pe site.
*/

export function ReviewForm({ token, clientName }: { token: string; clientName: string }) {
  const [rating, setRating] = useState(5);
  const [quote, setQuote] = useState("");
  const [displayName, setDisplayName] = useState(clientName || "");
  const [siteUrl, setSiteUrl] = useState("");
  const [consentPublic, setConsentPublic] = useState(true);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
        <h2 className="mt-3 font-serif text-xl font-bold text-brand-navy">Mulțumim!</h2>
        <p className="mt-2 text-sm text-slate-600">
          Am primit părerea dumneavoastră. Ne ajută mai mult decât credeți.
        </p>
      </div>
    );
  }

  async function trimite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (quote.trim().length < 10) {
      setError("Scrieți vă rog cel puțin un rând.");
      return;
    }
    if (displayName.trim().length < 2) {
      setError("Scrieți numele sau firma care să apară.");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/recenzie", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          rating,
          quote: quote.trim(),
          displayName: displayName.trim(),
          siteUrl: siteUrl.trim(),
          consentPublic,
          website,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) throw new Error(body.error || "Nu am putut trimite acum.");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Nu am putut trimite acum.");
    }
  }

  return (
    <form
      onSubmit={trimite}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      <label className="block text-sm font-semibold text-brand-navy">Cât de mulțumit sunteți?</label>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} ${n === 1 ? "stea" : "stele"}`}
            className="p-1 transition hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${n <= rating ? "text-brand-gold" : "text-slate-300"}`}
              fill={n <= rating ? "currentColor" : "none"}
            />
          </button>
        ))}
      </div>

      <label htmlFor="quote" className="mt-6 block text-sm font-semibold text-brand-navy">
        Părerea dumneavoastră
      </label>
      <textarea
        id="quote"
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        rows={5}
        placeholder="Ce v-a plăcut, ce ați folosit mai departe, cum a decurs colaborarea."
        className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
      />

      <label htmlFor="displayName" className="mt-6 block text-sm font-semibold text-brand-navy">
        Numele sau firma care să apară
      </label>
      <input
        id="displayName"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Ex.: Popescu Construcții SRL"
        className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
      />
      <p className="mt-1.5 text-xs text-slate-500">
        Cum vreți să vă prezentăm: cu numele dumneavoastră sau cu numele firmei.
      </p>

      <label htmlFor="siteUrl" className="mt-6 block text-sm font-semibold text-brand-navy">
        Site-ul firmei <span className="font-normal text-slate-500">(opțional)</span>
      </label>
      <input
        id="siteUrl"
        value={siteUrl}
        onChange={(e) => setSiteUrl(e.target.value)}
        placeholder="firma.ro"
        className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
      />

      <label className="mt-6 flex items-start gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={consentPublic}
          onChange={(e) => setConsentPublic(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          Sunt de acord ca părerea mea să apară pe site-ul MediaExpres, cu numele
          de mai sus. Dacă nu bifați, o citim doar noi.
        </span>
      </label>

      {/* Honeypot — ascuns pentru oameni, tentant pentru boti. */}
      <input
        type="text"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-6 w-full rounded-lg bg-brand-red px-6 py-3.5 text-base font-bold text-white transition hover:bg-brand-red/90 disabled:opacity-60"
      >
        {status === "submitting" ? "Se trimite…" : "Trimite părerea"}
      </button>
    </form>
  );
}
