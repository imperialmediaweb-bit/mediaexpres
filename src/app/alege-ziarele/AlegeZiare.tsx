"use client";

import { useMemo, useState } from "react";
import { Check, Search, X, Newspaper, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ZIARE_ALEGIBILE,
  TOTAL_ZIARE,
  PRET_RETEA,
  pretAlacarte,
  urmatorulPrag,
  type ZiarAles,
} from "@/lib/alacarte";

const REGIUNI = ["Național", "Moldova", "Transilvania", "Muntenia", "Banat"] as const;
type Regiune = (typeof REGIUNI)[number];

function numeRegiune(r: Regiune) {
  if (r === "Național") return "Publicații naționale";
  if (r === "Muntenia") return "Muntenia + București + Dobrogea";
  if (r === "Banat") return "Banat + Oltenia";
  return r;
}

/** Fără diacritice, ca „iasi" să găsească „Iași". */
function faraDiacritice(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .toLowerCase();
}

export function AlegeZiare() {
  const [alese, setAlese] = useState<string[]>([]);
  const [cautare, setCautare] = useState("");
  const [seTrimite, setSeTrimite] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);

  const q = faraDiacritice(cautare.trim());
  const filtrate = useMemo(() => {
    if (!q) return ZIARE_ALEGIBILE;
    return ZIARE_ALEGIBILE.filter((z) =>
      faraDiacritice(`${z.name} ${z.county || ""} ${z.city || ""}`).includes(q),
    );
  }, [q]);

  const pret = pretAlacarte(alese.length);
  const prag = urmatorulPrag(alese.length);
  const toateAlese = alese.length >= TOTAL_ZIARE;

  function comuta(z: ZiarAles) {
    setAlese((prev) =>
      prev.includes(z.slug) ? prev.filter((s) => s !== z.slug) : [...prev, z.slug],
    );
  }

  function alegeRegiune(r: Regiune) {
    const sluguri = ZIARE_ALEGIBILE.filter((z) => z.region === r).map((z) => z.slug);
    const toateBifate = sluguri.every((s) => alese.includes(s));
    setAlese((prev) =>
      toateBifate
        ? prev.filter((s) => !sluguri.includes(s))
        : Array.from(new Set([...prev, ...sluguri])),
    );
  }

  async function cumpara() {
    if (alese.length === 0 || seTrimite) return;
    setSeTrimite(true);
    setEroare(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: "alacarte",
          mode: "alacarte",
          ziare: alese,
        }),
      });
      const data = await res.json();
      if (data?.ok && data.url) {
        window.location.href = data.url as string;
        return;
      }
      setEroare(data?.error || "Nu am putut deschide pagina de plată. Încearcă din nou.");
    } catch {
      setEroare("Conexiunea a căzut. Încearcă din nou sau scrie-ne pe WhatsApp.");
    }
    setSeTrimite(false);
  }

  return (
    <div className="relative">
      {/* Căutare + acțiuni rapide */}
      <div className="mx-auto max-w-5xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={cautare}
            onChange={(e) => setCautare(e.target.value)}
            placeholder="Caută un județ sau un oraș — Cluj, Pitești, Iași…"
            className="w-full rounded-xl border border-slate-300 py-4 pl-12 pr-4 text-base outline-none focus:border-brand-red focus:ring-2 focus:ring-red-100"
            aria-label="Caută publicația"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAlese(ZIARE_ALEGIBILE.map((z) => z.slug))}
            className="rounded-full border border-brand-red bg-red-50 px-4 py-2 text-sm font-semibold text-brand-red transition hover:bg-red-100"
          >
            Bifează toate {TOTAL_ZIARE} ({PRET_RETEA} lei)
          </button>
          {REGIUNI.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => alegeRegiune(r)}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-brand-red hover:text-brand-red"
            >
              {r === "Național" ? "Naționale" : r}
            </button>
          ))}
          {alese.length > 0 && (
            <button
              type="button"
              onClick={() => setAlese([])}
              className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm text-slate-500 transition hover:text-brand-red"
            >
              <X className="h-4 w-4" /> Șterge selecția
            </button>
          )}
        </div>
      </div>

      {/* Lista publicațiilor */}
      <div className="mx-auto mt-8 max-w-5xl space-y-8 pb-40">
        {REGIUNI.map((r) => {
          const publicatii = filtrate
            .filter((z) => z.region === r)
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, "ro"));
          if (publicatii.length === 0) return null;
          return (
            <div key={r}>
              <h2 className="font-serif text-lg font-bold text-brand-navy">
                {numeRegiune(r)}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({publicatii.length})
                </span>
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {publicatii.map((z) => {
                  const bifat = alese.includes(z.slug);
                  return (
                    <li key={z.slug}>
                      <button
                        type="button"
                        onClick={() => comuta(z)}
                        aria-pressed={bifat}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                          bifat
                            ? "border-brand-red bg-red-50"
                            : "border-slate-200 bg-white hover:border-slate-300",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                            bifat
                              ? "border-brand-red bg-brand-red text-white"
                              : "border-slate-300 bg-white",
                          )}
                          aria-hidden
                        >
                          {bifat && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-brand-navy">
                            {z.name}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {z.city || z.county || "Național"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {filtrate.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-600">
            Nu avem publicație pentru „{cautare}&rdquo;. Caută după județ — pentru Pitești, de
            exemplu, publicația se numește Argeș Expres.
          </p>
        )}
      </div>

      {/*
        Bara de jos: singurul loc unde se vede prețul și se plătește. Rămâne
        lipită de ecran, fiindcă lista e lungă și omul bifează în mijlocul ei —
        dacă butonul e doar la final, îl găsește după ce a derulat 50 de rânduri.
      */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="container py-4">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Newspaper className="h-4 w-4 shrink-0 text-brand-red" />
                {alese.length === 0 ? (
                  <span>Nu ai bifat nicio publicație.</span>
                ) : (
                  <span>
                    <strong className="text-brand-navy">{alese.length}</strong>{" "}
                    {alese.length === 1 ? "publicație" : "publicații"}
                    {toateAlese ? " — toată rețeaua" : ` · ${pret.peBucata} lei bucata`}
                  </span>
                )}
              </p>
              {alese.length > 0 && !toateAlese && (
                <p className="mt-1 text-xs text-slate-500">
                  {pret.laPlafon ? (
                    <>
                      Ai atins prețul întregii rețele.{" "}
                      <button
                        type="button"
                        onClick={() => setAlese(ZIARE_ALEGIBILE.map((z) => z.slug))}
                        className="font-semibold text-brand-red underline"
                      >
                        Ia toate cele {TOTAL_ZIARE} pe aceiași bani →
                      </button>
                    </>
                  ) : prag ? (
                    <>
                      De la {prag.deLa} publicații, fiecare te costă cu{" "}
                      {prag.economiePeBucata} de lei mai puțin.
                    </>
                  ) : null}
                </p>
              )}
              {eroare && <p className="mt-1 text-xs font-medium text-brand-red">{eroare}</p>}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-serif text-2xl font-bold text-brand-navy">
                  {pret.total} lei
                </p>
                {pret.total > 0 && pret.faraReducere > pret.total && (
                  <p className="text-xs text-slate-400 line-through">
                    {pret.faraReducere} lei
                  </p>
                )}
              </div>
              <Button
                variant="accent"
                size="lg"
                onClick={cumpara}
                disabled={alese.length === 0 || seTrimite}
              >
                {seTrimite ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Se deschide…
                  </>
                ) : (
                  "Plătește cu cardul →"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
