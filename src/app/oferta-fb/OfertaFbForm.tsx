"use client";

import { useState } from "react";
import { trackPixelEvent } from "@/components/analytics/MetaPixel";
import { CheckCircle2, Loader2 } from "lucide-react";

function makeEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function OfertaFbForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    const eventId = makeEventId();
    try {
      const res = await fetch("/api/oferta-fb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, website, eventId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error || "A apărut o eroare. Încearcă din nou.");
        setSubmitting(false);
        return;
      }
      trackPixelEvent(
        "Lead",
        { content_name: "Oferta FB Landing", content_category: "facebook-ad" },
        eventId,
      );
      setSuccess(true);
    } catch {
      setError("Conexiune nereușită. Verifică internetul și încearcă din nou.");
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <h3 className="mt-3 font-serif text-xl font-bold text-brand-navy">
          Mulțumim! Verifică emailul.
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Ți-am trimis oferta personalizată cu toate detaliile — pachete, prețuri și lista
          de ziare. Durează maxim 2-3 minute să apară.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          Nu găsești emailul? Verifică și folderul Spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />
      <div>
        <label htmlFor="fb-name" className="block text-sm font-medium text-brand-navy">
          Nume complet
        </label>
        <input
          id="fb-name"
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ion Popescu"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
        />
      </div>
      <div>
        <label htmlFor="fb-email" className="block text-sm font-medium text-brand-navy">
          Email
        </label>
        <input
          id="fb-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ion@firma.ro"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
        />
      </div>
      <div>
        <label htmlFor="fb-phone" className="block text-sm font-medium text-brand-navy">
          Telefon
        </label>
        <input
          id="fb-phone"
          type="tel"
          required
          minLength={9}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07XX XXX XXX"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
        />
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-3 text-base font-semibold text-white shadow-lg shadow-brand-red/30 transition hover:bg-brand-red/90 disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Se trimite...
          </>
        ) : (
          "Vreau oferta personalizată"
        )}
      </button>
      <p className="text-center text-xs text-slate-500">Fără spam. Niciodată nu îți vindem datele.</p>
    </form>
  );
}
