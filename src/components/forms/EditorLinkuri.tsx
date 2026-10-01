"use client";

import { useMemo, useState, type RefObject } from "react";
import { Link2, Plus, X } from "lucide-react";
import { articolHtml, normalizeazaUrl } from "@/lib/articol-html";

export interface LinkAles {
  ancora: string;
  url: string;
}

/**
 * Linkurile din articol, puse direct pe cuvinte (01.10.2026).
 *
 * Pana acum clientul scria intr-o caseta „cuvant → adresa", iar proprietarul
 * trebuia sa ghiceasca unde cade linkul. Acum: selecteaza cuvantul in text,
 * apasa „Pune link", scrie adresa, si vede dedesubt articolul exact cum va
 * aparea, cu linkul pe cuvant. Se salveaza tot ca „ancora → adresa" (nimic
 * nu se schimba in baza sau la parteneri), dar previzualizarea e aceeasi
 * functie care pune linkurile si la publicare, deci ce vede e ce primeste.
 */
export function EditorLinkuri({
  body,
  linkuri,
  onChange,
  textareaRef,
  maxim = 3,
}: {
  body: string;
  linkuri: LinkAles[];
  onChange: (l: LinkAles[]) => void;
  /** Caseta cu textul: de aici citim cuvantul selectat. */
  textareaRef: RefObject<HTMLTextAreaElement>;
  maxim?: number;
}) {
  const [nou, setNou] = useState<{ ancora: string; url: string } | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (!body.trim()) return null;
    const note = linkuri
      .filter((l) => l.url.trim())
      .map((l) => `${l.ancora.trim()} → ${normalizeazaUrl(l.url)}`)
      .join("\n");
    return articolHtml({ titlu: "", corp: body, linkNotes: note, dofollow: true });
  }, [body, linkuri]);

  function dinSelectie() {
    setEroare(null);
    const el = textareaRef.current;
    const sel = el ? el.value.slice(el.selectionStart, el.selectionEnd).trim() : "";
    if (!sel) {
      setEroare("Întâi selectează (marchează cu mouse-ul sau cu degetul) cuvântul din text pe care vrei linkul.");
      return;
    }
    if (sel.length > 80 || sel.includes("\n")) {
      setEroare("Selectează doar câteva cuvinte, nu un paragraf întreg.");
      return;
    }
    if (linkuri.length >= maxim) {
      setEroare(`Poți pune cel mult ${maxim} linkuri.`);
      return;
    }
    setNou({ ancora: sel, url: "" });
  }

  function adauga() {
    if (!nou) return;
    const url = normalizeazaUrl(nou.url);
    if (!nou.ancora.trim()) return setEroare("Scrie cuvântul pe care vrei linkul.");
    if (!/^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(url)) return setEroare("Adresa nu arată bine. Exemplu: https://firma.ro/contact");
    onChange([...linkuri, { ancora: nou.ancora.trim(), url }]);
    setNou(null);
    setEroare(null);
  }

  const gasite = new Set<string>();
  if (preview) {
    const lipsa = new Set(preview.negasite.map((l) => (l.ancora || "").toLowerCase()));
    for (const l of linkuri) if (!lipsa.has(l.ancora.toLowerCase())) gasite.add(l.ancora.toLowerCase());
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" data-nu-acoperi="1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">
          Linkurile din articol <span className="font-normal text-slate-500">(până la {maxim})</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={dinSelectie}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy/90"
          >
            <Link2 className="h-3.5 w-3.5" /> Pune link pe cuvântul selectat
          </button>
          {linkuri.length < maxim && !nou && (
            <button
              type="button"
              onClick={() => setNou({ ancora: "", url: "" })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-navy"
            >
              <Plus className="h-3.5 w-3.5" /> Scrie cuvântul
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Marchează cuvântul în text și apasă butonul, sau scrie-l tu. Dacă nu pui niciun link, punem numele firmei ca
        link către site-ul tău.
      </p>

      {nou && (
        <div className="mt-3 grid gap-2 rounded-lg border border-brand-navy/30 bg-white p-3 sm:grid-cols-[1fr_1.4fr_auto]">
          <input
            value={nou.ancora}
            onChange={(e) => setNou({ ...nou, ancora: e.target.value })}
            placeholder="cuvântul din text"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
          />
          <input
            value={nou.url}
            onChange={(e) => setNou({ ...nou, url: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adauga())}
            placeholder="https://firma.ro/pagina"
            autoFocus
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-red focus:outline-none"
          />
          <div className="flex gap-1">
            <button type="button" onClick={adauga} className="rounded-lg bg-brand-red px-3 py-2 text-xs font-semibold text-white">
              Adaugă
            </button>
            <button type="button" onClick={() => setNou(null)} aria-label="Renunță" className="rounded-lg border border-slate-200 px-2 text-slate-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {eroare && <p className="mt-2 text-xs text-red-700">{eroare}</p>}

      {linkuri.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {linkuri.map((l, i) => {
            const ok = !body.trim() || gasite.has(l.ancora.toLowerCase());
            return (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                <span className={`font-semibold ${ok ? "text-brand-navy" : "text-amber-700"}`}>„{l.ancora}”</span>
                <span className="text-slate-400">→</span>
                <span className="min-w-0 flex-1 truncate text-slate-600">{l.url}</span>
                {!ok && <span className="text-xs text-amber-700">nu apare în text</span>}
                <button
                  type="button"
                  onClick={() => onChange(linkuri.filter((_, j) => j !== i))}
                  aria-label="Șterge linkul"
                  className="text-slate-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {preview && linkuri.length > 0 && (
        <details className="mt-3" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-500">
            Așa va apărea articolul, cu linkurile
          </summary>
          <div
            className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700 [&_a]:font-semibold [&_a]:text-brand-red [&_a]:underline [&_h2]:mt-3 [&_h2]:font-bold [&_h2]:text-brand-navy"
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
        </details>
      )}
    </div>
  );
}
