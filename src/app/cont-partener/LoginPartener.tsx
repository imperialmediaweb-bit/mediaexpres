"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LoginPartener() {
  const [email, setEmail] = useState("");
  const [stare, setStare] = useState<"gol" | "trimit" | "trimis" | "eroare">("gol");
  const [eroare, setEroare] = useState("");

  async function trimite(e: React.FormEvent) {
    e.preventDefault();
    setStare("trimit");
    try {
      const r = await fetch("/api/partener/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (!d.ok) {
        setEroare(d.error || "Nu am putut trimite linkul.");
        setStare("eroare");
        return;
      }
      setStare("trimis");
    } catch {
      setEroare("Conexiunea a căzut. Încearcă din nou.");
      setStare("eroare");
    }
  }

  if (stare === "trimis") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        Dacă adresa e a unei publicații partenere aprobate, ți-am trimis linkul pe email. Verifică și
        folderul Spam.
      </div>
    );
  }

  return (
    <form onSubmit={trimite} className="space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="redactie@publicatia-ta.ro"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-brand-red focus:ring-2 focus:ring-red-100"
      />
      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={stare === "trimit"}>
        {stare === "trimit" ? "Se trimite…" : "Trimite-mi linkul"}
      </Button>
      {stare === "eroare" && <p className="text-sm font-medium text-brand-red">{eroare}</p>}
    </form>
  );
}
