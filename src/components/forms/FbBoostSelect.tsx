"use client";

import { NEWSPAPERS } from "@/data/newspapers";

/**
 * Ziarul pe care promovam postarea de Facebook, 3 zile, prin reclama platita
 * (inclusa in pret). Clientul alege din lista: local, catre orasul lui, sau
 * national, daca vinde in toata tara. Gol = alegem noi ziarul din judetul
 * lui, dupa adresa de facturare. Acelasi control pe formularul OP si pe cel
 * de dupa plata cu cardul, ca sa nu difere.
 */
export function FbBoostSelect({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const nationale = NEWSPAPERS.filter((n) => n.type === "national");
  const locale = NEWSPAPERS.filter((n) => n.type !== "national").sort((a, b) =>
    (a.county || a.name).localeCompare(b.county || b.name, "ro"),
  );
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-slate-700">
        Promovarea pe Facebook, 3 zile — pe ce ziar?
      </span>
      <select
        name="fbBoostPaper"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
      >
        <option value="">Alegeți voi — ziarul din județul meu</option>
        <optgroup label="Naționale">
          {nationale.map((n) => (
            <option key={n.name} value={n.name}>
              {n.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Locale, pe județ">
          {locale.map((n) => (
            <option key={n.name} value={n.name}>
              {n.county ? `${n.county} — ${n.name}` : n.name}
            </option>
          ))}
        </optgroup>
      </select>
      <span className="mt-1 block text-xs text-slate-500">
        Articolul primește reclamă plătită 3 zile pe pagina de Facebook a ziarului
        ales — local, către orașul tău, sau național dacă vinzi în toată țara.
        Inclus în preț.
      </span>
    </label>
  );
}
