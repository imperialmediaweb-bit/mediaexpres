"use client";

import { AlertTriangle } from "lucide-react";
import {
  CONTENT_DECLARATION,
  CONTENT_DECLARATION_WARNING,
} from "@/lib/content-policy";

/**
 * Bifa de declaratie, identica pe toate formularele care primesc un articol.
 *
 * Deliberat NU e bifata din start: o bifa pre-bifata nu e o declaratie, e o
 * setare — iar aici tocmai asumarea clientului e lucrul care conteaza, pentru
 * ca de ea atarna faptul ca banii nu se mai restituie.
 */
export function ContentDeclaration({
  checked,
  onChange,
  className = "",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-amber-300 bg-amber-50 p-4 ${className}`}
    >
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="contentDeclaration"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-red"
        />
        <span className="text-slate-800">
          {CONTENT_DECLARATION}{" "}
          <a
            href="/legal/termeni"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-red underline"
          >
            Regulile de conținut
          </a>
        </span>
      </label>
      <p className="mt-2 flex items-start gap-2 pl-7 text-xs text-amber-900">
        <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
        <span>{CONTENT_DECLARATION_WARNING}</span>
      </p>
    </div>
  );
}
