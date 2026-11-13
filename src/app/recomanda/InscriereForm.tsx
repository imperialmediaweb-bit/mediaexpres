"use client";

import { useState } from "react";

const camp =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-navy focus:outline-none";

/** Formularul de inscriere in programul de recomandari (api/afiliati/inscriere). */
export function InscriereForm() {
  const [f, setF] = useState({ tip: "persoana" as "persoana" | "firma", nume: "", cui: "", iban: "", email: "", telefon: "" });
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

  const set = (k: "nume" | "cui" | "iban" | "email" | "telefon") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <form onSubmit={trimite} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {([
          ["persoana", "Persoană fizică", "Primesc vouchere eMAG"],
          ["firma", "PFA sau firmă", "Primesc bani, pe factură"],
        ] as const).map(([v, t, d]) => (
          <button
            key={v}
            type="button"
            onClick={() => setF({ ...f, tip: v })}
            className={`rounded-lg border px-3 py-3 text-left text-sm ${f.tip === v ? "border-brand-red bg-red-50" : "border-slate-300"}`}
          >
            <span className="block font-semibold text-brand-navy">{t}</span>
            <span className="text-slate-600">{d}</span>
          </button>
        ))}
      </div>
      <input className={camp} placeholder="Nume și prenume" value={f.nume} onChange={set("nume")} required />
      {f.tip === "firma" && (
        <>
          <input className={camp} placeholder="CUI firmă sau PFA" value={f.cui} onChange={set("cui")} required />
          <input className={camp} placeholder="IBAN (pentru plata comisioanelor)" value={f.iban} onChange={set("iban")} required />
        </>
      )}
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
        {stare === "trimit" ? (f.tip === "firma" ? "Se verifică la ANAF…" : "Se trimite…") : "Vreau linkul meu de partener"}
      </button>
      <p className="text-xs text-slate-500">
        {f.tip === "firma"
          ? "PFA și firme: comisionul se plătește lunar, pe baza facturii dumneavoastră."
          : "Fără firmă: primiți comisionul în vouchere eMAG, pe email, după ce clientul adus a plătit."}
      </p>
    </form>
  );
}
