"use client";

import { useState } from "react";

const camp =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-navy focus:outline-none";

/** Formularul de inscriere in programul de recomandari (api/afiliati/inscriere). */
export function InscriereForm() {
  const [f, setF] = useState({ nume: "", cui: "", iban: "", email: "", telefon: "" });
  const [stare, setStare] = useState<"liber" | "trimit" | { link: string; cont: string }>("liber");
  const [eroare, setEroare] = useState("");

  async function trimite(e: React.FormEvent) {
    e.preventDefault();
    setEroare("");
    setStare("trimit");
    try {
      const r = await fetch("/api/afiliati/inscriere", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const j = await r.json();
      if (!j.ok) {
        setEroare(j.error || "Nu am putut trimite înscrierea.");
        setStare("liber");
        return;
      }
      setStare({ link: j.link, cont: j.cont });
    } catch {
      setEroare("Eroare de conexiune. Reîncercați.");
      setStare("liber");
    }
  }

  if (typeof stare === "object") {
    return (
      <div className="space-y-4 text-center">
        <h3 className="font-serif text-2xl font-bold text-brand-navy">Gata, sunteți partener!</h3>
        <p className="text-sm text-slate-600">Linkul dumneavoastră personal:</p>
        <p className="break-all rounded-lg bg-slate-100 px-3 py-3 font-mono text-sm font-semibold text-brand-navy">
          {stare.link}
        </p>
        <a
          href={stare.cont}
          className="inline-block rounded-lg bg-brand-red px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          Intru în contul meu de partener
        </a>
        <p className="text-xs text-slate-500">V-am trimis linkurile și pe email.</p>
      </div>
    );
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <form onSubmit={trimite} className="space-y-4">
      <input className={camp} placeholder="Nume și prenume" value={f.nume} onChange={set("nume")} required />
      <input className={camp} placeholder="CUI firmă sau PFA" value={f.cui} onChange={set("cui")} required />
      <input className={camp} placeholder="IBAN (pentru plata comisioanelor)" value={f.iban} onChange={set("iban")} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <input className={camp} type="email" placeholder="Email" value={f.email} onChange={set("email")} required />
        <input className={camp} type="tel" placeholder="Telefon" value={f.telefon} onChange={set("telefon")} required />
      </div>
      {eroare && <p className="text-sm font-medium text-brand-red">{eroare}</p>}
      <button
        type="submit"
        disabled={stare === "trimit"}
        className="w-full rounded-lg bg-brand-red px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {stare === "trimit" ? "Se verifică la ANAF…" : "Vreau linkul meu de partener"}
      </button>
      <p className="text-xs text-slate-500">
        Programul este pentru PFA și firme: comisionul se plătește lunar, pe baza facturii dumneavoastră.
      </p>
    </form>
  );
}
