"use client";

import { useState } from "react";

/** Plata cu cardul pentru pachetul in euro (intl-50), direct spre Stripe, in engleza. */
export function ButonPlata({ label = "Order now — €149" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: "intl-50", mode: "package" }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok || !body.url) throw new Error(body.error || "Error");
      window.location.href = body.url;
    } catch {
      setError("Something went wrong. Please try again or write to us on WhatsApp.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className="rounded-lg bg-brand-red px-6 py-3.5 text-base font-semibold text-white shadow hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Opening secure payment…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
