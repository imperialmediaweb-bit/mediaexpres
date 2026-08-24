"use client";

import { useState } from "react";

/**
 * Trimite emailul cu lista completa a retelei (sablonul unic din
 * lib/list-email.ts) catre clientul din rand. Un click, fara webmail.
 */
export function SendListButton({ email, name }: { email: string; name: string | null }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");

  async function send() {
    if (state === "sending") return;
    setState("sending");
    setErr("");
    try {
      const res = await fetch("/api/admin/send-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Eroare");
      setState("sent");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare");
      setState("error");
    }
  }

  if (state === "sent") {
    return <span className="text-xs font-medium text-emerald-600">Lista trimisă ✓</span>;
  }
  return (
    <span>
      <button
        type="button"
        onClick={send}
        disabled={state === "sending"}
        className="text-xs font-medium text-slate-500 underline decoration-dotted hover:text-brand-navy disabled:opacity-50"
        title={`Trimite lista celor 50 de ziare către ${email}`}
      >
        {state === "sending" ? "Se trimite..." : "Trimite lista"}
      </button>
      {state === "error" && <span className="ml-1 text-xs text-red-600">{err}</span>}
    </span>
  );
}
