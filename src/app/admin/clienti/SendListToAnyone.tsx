"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";

/**
 * Trimite emailul cu lista retelei catre o adresa scrisa de mana.
 *
 * De ce exista separat de SendListButton: acela trimite catre un client din
 * tabel, deci presupune ca omul e deja in baza de date. Lead-urile venite pe
 * WhatsApp sau la telefon nu sunt nicaieri in sistem — pana acum nu aveai de
 * unde sa le trimiti lista fara sa le creezi intai cont, sau fara webmail.
 *
 * Ruta /api/admin/send-list accepta deja orice adresa; lipsea doar casuta.
 */
export function SendListToAnyone() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErr("Adresa de email nu e validă");
      setState("error");
      return;
    }
    setState("sending");
    setErr("");
    try {
      const res = await fetch("/api/admin/send-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Eroare la trimitere");
      setState("sent");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
          <CheckCircle2 className="h-4 w-4" />
          Lista a plecat către {email}
        </p>
        <button
          type="button"
          onClick={() => {
            setEmail("");
            setName("");
            setState("idle");
          }}
          className="mt-2 text-xs font-medium text-emerald-800 underline"
        >
          Trimite și altcuiva
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-brand-navy">
        Trimite lista celor 50 de ziare la o adresă
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        Pentru cine cere detalii pe WhatsApp sau la telefon și nu e încă în tabel. Emailul
        conține lista completă, specificațiile articolului și prețul.
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemplu.ro"
          required
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Prenume (opțional)"
          className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-red/90 disabled:opacity-60"
        >
          {state === "sending" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {state === "sending" ? "Se trimite..." : "Trimite lista"}
        </button>
      </div>
      {state === "error" && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </form>
  );
}
