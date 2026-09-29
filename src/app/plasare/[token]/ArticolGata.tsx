"use client";

import { useRef, useState } from "react";
import { Copy, Check, Download, Code2, FileText } from "lucide-react";

/**
 * Articolul, gata de pus pe site: copiat cu linkurile pe cuvinte (se lipeste
 * direct in editorul vizual din WordPress), ca HTML, sau descarcat.
 * `html` vine de pe server, deja escapat (lib/articol-html.ts).
 */
export function ArticolGata({
  titlu,
  html,
  poze,
  featuredIndex,
}: {
  titlu: string;
  html: string;
  poze: { url: string; descarcare: string }[];
  featuredIndex: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [copiat, setCopiat] = useState<string | null>(null);

  function gata(ce: string) {
    setCopiat(ce);
    setTimeout(() => setCopiat((c) => (c === ce ? null : c)), 2000);
  }

  async function copiazaText(ce: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    gata(ce);
  }

  async function copiazaCuLinkuri() {
    const text = ref.current?.innerText || "";
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
    } catch {
      // Browsere fara ClipboardItem: selectam articolul afisat si il copiem
      // ca selectie — tot cu linkuri.
      const sel = window.getSelection();
      if (ref.current && sel) {
        const r = document.createRange();
        r.selectNodeContents(ref.current);
        sel.removeAllRanges();
        sel.addRange(r);
        document.execCommand("copy");
        sel.removeAllRanges();
      }
    }
    gata("articol");
  }

  const nume = titlu
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "articol";

  function descarca(ext: "html" | "doc") {
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${titlu.replace(/</g, "&lt;")}</title></head><body><h1>${titlu.replace(/</g, "&lt;")}</h1>\n${html}</body></html>`;
    const blob = new Blob([ext === "doc" ? "﻿" + doc : doc], {
      type: ext === "doc" ? "application/msword" : "text/html",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${nume}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function descarcaToatePozele() {
    for (const p of poze) {
      const a = document.createElement("a");
      a.href = p.descarcare;
      a.download = "";
      a.rel = "noreferrer";
      a.click();
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  const buton =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-brand-navy transition hover:border-brand-navy";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copiazaCuLinkuri}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-red px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {copiat === "articol" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiat === "articol" ? "Copiat" : "Copiază articolul (cu linkuri)"}
        </button>
        <button type="button" onClick={() => copiazaText("titlu", titlu)} className={buton}>
          {copiat === "titlu" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiat === "titlu" ? "Copiat" : "Copiază titlul"}
        </button>
        <button type="button" onClick={() => copiazaText("html", html)} className={buton}>
          {copiat === "html" ? <Check className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
          {copiat === "html" ? "Copiat" : "Copiază HTML"}
        </button>
        <button type="button" onClick={() => descarca("html")} className={buton}>
          <Download className="h-4 w-4" /> Descarcă HTML
        </button>
        <button type="button" onClick={() => descarca("doc")} className={buton}>
          <FileText className="h-4 w-4" /> Descarcă Word
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        „Copiază articolul” îl lipești direct în editorul site-ului (WordPress, vizual), cu linkurile deja
        puse pe cuvinte. „Copiază HTML” e pentru editorul de cod.
      </p>

      <div
        ref={ref}
        className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700 [&_a]:text-brand-red [&_a]:underline [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-brand-navy"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {poze.length > 0 && (
        <div className="mt-5">
          <div data-nu-acoperi="1" className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pozele</p>
            <button type="button" onClick={descarcaToatePozele} className={buton}>
              <Download className="h-4 w-4" /> Descarcă toate pozele
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {poze.map((p, i) => (
              <div key={p.url} className="w-40">
                <a href={p.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt=""
                    className={`h-28 w-40 rounded-lg border-2 object-cover ${i === featuredIndex ? "border-brand-red" : "border-slate-200"}`}
                  />
                </a>
                <a
                  href={p.descarcare}
                  download
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-navy underline"
                >
                  <Download className="h-3 w-3" />
                  {i === featuredIndex ? "Descarcă (poza principală)" : "Descarcă"}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
