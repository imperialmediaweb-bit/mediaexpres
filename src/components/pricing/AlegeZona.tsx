"use client";

import { ZONE, ziareLocale, type FelAlegere } from "@/lib/zona-pachet";

/**
 * Alegerea de pe pachetele Regional (zona) si Local (ziarul judetean), 08.10.2026.
 * Folosita pe cardul pachetului si pe formularul de plata prin OP.
 */
export function AlegeZona({ fel, valoare, onChange }: { fel: Exclude<FelAlegere, null>; valoare: string; onChange: (v: string) => void }) {
  if (fel === "zona") {
    return (
      <fieldset className="rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-brand-navy">Alege zona *</legend>
        <div className="grid grid-cols-2 gap-2">
          {ZONE.map((z) => (
            <label
              key={z}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${valoare === z ? "border-brand-red bg-red-50 font-semibold text-brand-navy" : "border-slate-200 text-slate-700"}`}
            >
              <input type="radio" name="zona" value={z} checked={valoare === z} onChange={() => onChange(z)} className="accent-brand-red" />
              {z}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">Alegem noi cele mai potrivite ziare din zona ta.</p>
      </fieldset>
    );
  }
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-navy">Alege ziarul județean *</span>
      <select
        value={valoare}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">— alege județul —</option>
        {ziareLocale().map((z) => (
          <option key={z.nume} value={z.nume}>
            {z.judet} — {z.nume}
          </option>
        ))}
      </select>
    </label>
  );
}
