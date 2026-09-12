"use client";

import { RITMURI, ritmDupaId, type RitmId } from "@/lib/ritm";

/*
  Alegerea ritmului de publicare, aceeasi in formularul de transfer si in cel
  de dupa plata cu cardul: un dropdown cu cele trei variante si, sub el,
  explicatia celei alese. Omul alege dupa ce vrea sa obtina, nu dupa un
  termen tehnic.
*/
export function RitmSelect({
  value,
  onChange,
  className = "",
}: {
  value: RitmId;
  onChange: (v: RitmId) => void;
  className?: string;
}) {
  const ales = ritmDupaId(value);
  return (
    <div className={className}>
      <label htmlFor="ritm" className="block font-semibold text-brand-navy">
        În cât timp să apară cele 50 de articole?
      </label>
      <select
        id="ritm"
        name="ritm"
        value={value}
        onChange={(e) => onChange(e.target.value as RitmId)}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-brand-navy focus:border-brand-red focus:outline-none"
      >
        {RITMURI.map((r) => (
          <option key={r.id} value={r.id}>
            {r.eticheta} — {r.scurt}
          </option>
        ))}
      </select>
      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600" data-testid="ritm-explicatie">
        {ales.explicatie}{" "}
        <a
          href="/ritm-publicare"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand-red hover:underline"
        >
          Detalii despre fiecare variantă →
        </a>
      </p>
    </div>
  );
}
