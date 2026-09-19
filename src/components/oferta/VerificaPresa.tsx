"use client";

import { useState } from "react";
import { Loader2, Search, Newspaper, ExternalLink } from "lucide-react";
import { ButonComanda } from "@/components/comanda/comanda-promo";

/**
 * „Câte mențiuni ai tu, acum?" — auditul de presă, pus pe pagina de ofertă.
 *
 * 19.09.2026 — auditul exista de mult la `/audit-mentiuni`, dar acolo ajunge
 * doar cine îl caută. Pe pagina de ofertă are alt rost: vizitatorul citește
 * ce vindem, iar aici își vede propria cifră. „0 mențiuni în 30 de zile"
 * spus despre FIRMA LUI cântărește mai mult decât orice text de vânzare
 * scris de noi despre noi.
 *
 * Textele de aici sunt proprii, NU cele din pagina veche: aceea trimite la
 * pachetele de 150 și 1.500 de lei, care n-au ce căuta pe pagina ofertei de
 * 500.
 *
 * Cifra se ia din Google News (`/api/audit-mentiuni`), gratuit, fără cheie.
 * Serverul limitează la 5 verificări pe oră de IP; mesajul lui ajunge la om
 * ca atare, nu îl înlocuim cu „a eșuat".
 */

interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
}

interface Audit {
  totalLast30Days: number;
  totalLast6Months: number;
  totalAll: number;
  recent: NewsItem[];
  uniqueSources: number;
}

/**
 * Verdictul, scris pentru oferta de 500.
 *
 * Cazul „apare des" NU se pretinde a fi o problemă — ar fi o minciună pe
 * care omul o vede imediat. Acolo mutăm discuția pe ce chiar lipsește:
 * numărul de publicații diferite. O firmă cu 34 de mențiuni le are, de
 * regulă, pe 5-6 site-uri; noi dăm 50 dintr-o dată.
 */
function verdict(a: Audit): { titlu: string; text: string; ton: "rau" | "slab" | "bun" } {
  if (a.totalLast30Days === 0 && a.totalAll === 0) {
    return {
      ton: "rau",
      titlu: "Nu apari deloc în presă",
      text: "Căutarea nu a găsit niciun articol despre firma ta. Cine te caută pe Google — un client, un partener, o bancă — nu găsește decât site-ul tău, adică ce spui tu despre tine.",
    };
  }
  if (a.totalLast30Days === 0) {
    return {
      ton: "rau",
      titlu: "Nu ai apărut în ultima lună",
      text: `Ai ${a.totalAll} articole mai vechi, dar nimic în ultimele 30 de zile. O apariție veche nu se mai vede: cine caută azi ajunge la știrile de azi.`,
    };
  }
  if (a.totalLast30Days < 5) {
    return {
      ton: "slab",
      titlu: "Apari rar, și pe puține publicații",
      text: `${a.totalLast30Days} ${a.totalLast30Days === 1 ? "mențiune" : "mențiuni"} în ultimele 30 de zile, pe ${a.uniqueSources} ${a.uniqueSources === 1 ? "publicație" : "publicații"}. E o prezență care se stinge repede dacă nu o întreții.`,
    };
  }
  return {
    ton: "bun",
    titlu: "Apari des — dar pe câte publicații?",
    text: `${a.totalLast30Days} mențiuni în 30 de zile, însă pe ${a.uniqueSources} publicații. Asta e diferența: noi îți dăm 50 de apariții, pe 50 de site-uri diferite, dintr-o singură plată.`,
  };
}

const CULORI: Record<"rau" | "slab" | "bun", string> = {
  rau: "border-red-200 bg-red-50",
  slab: "border-amber-200 bg-amber-50",
  bun: "border-emerald-200 bg-emerald-50",
};

export function VerificaPresa() {
  const [firma, setFirma] = useState("");
  const [audit, setAudit] = useState<Audit | null>(null);
  const [stare, setStare] = useState<"gol" | "cauta">("gol");
  const [eroare, setEroare] = useState<string | null>(null);

  async function cauta() {
    const nume = firma.trim();
    if (nume.length < 2) {
      setEroare("Scrie numele firmei.");
      return;
    }
    setStare("cauta");
    setEroare(null);
    setAudit(null);
    try {
      const res = await fetch("/api/audit-mentiuni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: nume }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || "Nu am putut verifica acum.");
      setAudit(body.audit);
    } catch (e: unknown) {
      setEroare(e instanceof Error ? e.message : "Nu am putut verifica acum.");
    } finally {
      setStare("gol");
    }
  }

  const v = audit ? verdict(audit) : null;

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
      <div className="flex items-start gap-3">
        <Newspaper className="mt-0.5 h-6 w-6 shrink-0 text-brand-red" />
        <div>
          <h3 className="font-serif text-xl font-bold text-brand-navy md:text-2xl">
            Câte mențiuni în presă are firma ta, acum?
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Scrie numele firmei și îți arătăm ce găsește presa despre ea. Durează câteva secunde,
            nu cerem email și nu salvăm nimic.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={firma}
          onChange={(e) => setFirma(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") cauta();
          }}
          placeholder="Numele firmei tale"
          aria-label="Numele firmei tale"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-base text-brand-navy outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
        />
        <button
          type="button"
          onClick={cauta}
          disabled={stare === "cauta"}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-navy px-6 py-3 text-base font-bold text-white transition hover:bg-brand-navy/90 disabled:opacity-60"
        >
          {stare === "cauta" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
          {stare === "cauta" ? "Caut..." : "Verifică"}
        </button>
      </div>

      {eroare && <p className="mt-3 text-sm font-semibold text-red-700">{eroare}</p>}

      {audit && v && (
        <div className={`mt-6 rounded-xl border p-5 ${CULORI[v.ton]}`}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-serif text-3xl font-bold text-brand-navy">
                {audit.totalLast30Days}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-slate-600">
                în 30 de zile
              </p>
            </div>
            <div>
              <p className="font-serif text-3xl font-bold text-brand-navy">
                {audit.totalLast6Months}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-slate-600">în 6 luni</p>
            </div>
            <div>
              <p className="font-serif text-3xl font-bold text-brand-navy">
                {audit.uniqueSources}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-slate-600">publicații</p>
            </div>
          </div>

          <p className="mt-5 font-serif text-lg font-bold text-brand-navy">{v.titlu}</p>
          <p className="mt-1 text-sm text-slate-700">{v.text}</p>

          {audit.recent.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-t border-black/10 pt-4">
              {audit.recent.slice(0, 3).map((it) => (
                <li key={it.link} className="text-sm">
                  <a
                    href={it.link}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-start gap-1.5 text-slate-700 hover:text-brand-red"
                  >
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <span className="font-semibold">{it.source}</span> — {it.title}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 border-t border-black/10 pt-5">
            <p className="text-sm font-semibold text-brand-navy">
              50 de apariții, pe 50 de publicații, dintr-o singură plată.
            </p>
            <ButonComanda className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-6 py-3.5 text-base font-bold text-white transition hover:bg-brand-red/90 disabled:opacity-60 sm:w-auto" />
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Căutarea se face în Google News, după numele scris de tine. Dacă firma are un nume comun,
        pot apărea și rezultate care nu sunt ale ei.
      </p>
    </div>
  );
}
