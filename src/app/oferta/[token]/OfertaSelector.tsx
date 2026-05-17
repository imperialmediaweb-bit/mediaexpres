"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle,
  Newspaper as NewspaperIcon,
  Rocket,
  MessageCircle,
  Clock,
  ExternalLink,
  MapPin,
  Globe,
} from "lucide-react";
import type { Newspaper } from "@/data/newspapers";

type PackageId = "local" | "regional" | "national";
type RegionId = "Moldova" | "Transilvania" | "Muntenia" | "Banat";
type View = "main" | "question" | "later" | "sent";

const PACKAGES: Array<{
  id: PackageId;
  name: string;
  tagline: string;
  price: number;
  reach: string;
  highlights: string[];
  badge?: string;
  featured?: boolean;
}> = [
  {
    id: "local",
    name: "Local",
    tagline: "1 ziar județean la alegere",
    price: 150,
    reach: "1 ziar din rețea",
    highlights: ["1 articol pe 1 ziar județean", "Distribuție Facebook", "Link în 24h"],
  },
  {
    id: "regional",
    name: "Regional",
    tagline: "10 ziare dintr-o zonă",
    price: 500,
    reach: "10 ziare per regiune",
    highlights: ["1 articol pe 10 ziare regionale", "Distribuție Facebook", "Linkuri în 24h"],
  },
  {
    id: "national",
    name: "Național 50",
    tagline: "Toată rețeaua — 41 locale + 9 naționale",
    price: 1500,
    reach: "50 ziare (41 locale + 9 naționale)",
    highlights: [
      "1 articol pe 50 de ziare",
      "Distribuție pe 50 pagini Facebook",
      "50 backlinks SEO din domenii .ro",
      "Raport PDF complet",
    ],
    badge: "Cel mai popular",
    featured: true,
  },
];

const REGIONS_INFO: Array<{ id: RegionId; label: string; description: string }> = [
  { id: "Moldova", label: "Moldova", description: "Iași, Suceava, Galați, Bacău, Brăila, Buzău..." },
  { id: "Transilvania", label: "Transilvania", description: "Cluj, Brașov, Sibiu, Mureș, Oradea, Alba..." },
  { id: "Muntenia", label: "Muntenia + Dobrogea", description: "București, Prahova, Constanța, Argeș..." },
  { id: "Banat", label: "Banat & Oltenia", description: "Timiș, Arad, Dolj, Olt, Vâlcea, Gorj..." },
];

interface Props {
  token: string;
  firstName: string;
  newspapers: Newspaper[];
}

export function OfertaSelector({ token, firstName, newspapers }: Props) {
  const [pkg, setPkg] = useState<PackageId>("national");
  const [region, setRegion] = useState<RegionId>("Moldova");
  const [localCounty, setLocalCounty] = useState<string>("");
  const [view, setView] = useState<View>("main");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(
    () => ({
      Moldova: newspapers.filter((n) => n.region === "Moldova"),
      Transilvania: newspapers.filter((n) => n.region === "Transilvania"),
      Muntenia: newspapers.filter((n) => n.region === "Muntenia"),
      Banat: newspapers.filter((n) => n.region === "Banat"),
      Național: newspapers.filter((n) => n.region === "Național"),
    }),
    [newspapers],
  );

  const selectedPkgData = PACKAGES.find((p) => p.id === pkg)!;

  const finalPrice =
    pkg === "national" ? 1500 : pkg === "regional" ? 500 : 150;

  const continueHref = useMemo(() => {
    const params = new URLSearchParams({ pkg });
    if (pkg === "regional") params.set("region", region);
    if (pkg === "local" && localCounty) params.set("county", localCounty);
    return `/materiale/${token}?${params.toString()}`;
  }, [pkg, region, localCounty, token]);

  async function sendQuestion() {
    if (!question.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/fb-lead/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, question }),
      });
    } finally {
      setLoading(false);
      setView("sent");
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-2 font-serif text-2xl font-bold text-brand-navy">
          Alege pachetul tău
        </h2>
        <p className="mb-6 text-sm text-slate-600">
          Bifează ce vrei să publici. Poți schimba alegerea oricând.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {PACKAGES.map((p) => {
            const selected = pkg === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPkg(p.id)}
                className={`relative rounded-2xl border-2 bg-white p-5 text-left transition ${
                  selected
                    ? "border-brand-red shadow-xl ring-2 ring-brand-red/20"
                    : p.featured
                    ? "border-slate-300 shadow"
                    : "border-slate-200 shadow"
                }`}
              >
                {p.badge && (
                  <span className="mb-2 inline-block rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-white">
                    {p.badge}
                  </span>
                )}
                <div className="flex items-start justify-between">
                  <h3 className="font-serif text-lg font-bold text-brand-navy">{p.name}</h3>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                      selected ? "border-brand-red bg-brand-red" : "border-slate-300 bg-white"
                    }`}
                  >
                    {selected && <CheckCircle className="h-5 w-5 text-white" />}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{p.tagline}</p>
                <p className="mt-3 text-2xl font-bold text-brand-red">
                  {p.price.toLocaleString("ro")}{" "}
                  <span className="text-base font-normal text-slate-500">RON</span>
                </p>
                <p className="mt-1 text-xs text-slate-600">{p.reach}</p>
                <ul className="mt-3 space-y-1.5">
                  {p.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                      {h}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </section>

      {pkg === "regional" && (
        <section className="rounded-2xl border-2 border-brand-red/30 bg-red-50/40 p-6">
          <h3 className="mb-1 flex items-center gap-2 font-serif text-lg font-bold text-brand-navy">
            <MapPin className="h-5 w-5 text-brand-red" />
            Alege regiunea ta — 500 RON, 10 ziare
          </h3>
          <p className="mb-4 text-sm text-slate-600">Bifează zona unde vrei să apară articolul.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {REGIONS_INFO.map((r) => {
              const selected = region === r.id;
              const count = grouped[r.id].length;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRegion(r.id)}
                  className={`flex items-start gap-3 rounded-xl border-2 bg-white p-4 text-left transition ${
                    selected
                      ? "border-brand-red shadow ring-2 ring-brand-red/20"
                      : "border-slate-200 hover:border-brand-red/50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? "border-brand-red bg-brand-red" : "border-slate-300"
                    }`}
                  >
                    {selected && <CheckCircle className="h-4 w-4 text-white" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-brand-navy">
                      {r.label}{" "}
                      <span className="font-normal text-slate-500">({count} ziare)</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">{r.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {pkg === "local" && (
        <section className="rounded-2xl border-2 border-brand-red/30 bg-red-50/40 p-6">
          <h3 className="mb-1 flex items-center gap-2 font-serif text-lg font-bold text-brand-navy">
            <MapPin className="h-5 w-5 text-brand-red" />
            Alege ziarul județean — 150 RON
          </h3>
          <p className="mb-4 text-sm text-slate-600">
            Bifează în ce județ vrei să apară articolul (1 ziar).
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {newspapers
              .filter((n) => n.type === "local")
              .map((n) => {
                const selected = localCounty === (n.county || n.name);
                return (
                  <button
                    key={n.url}
                    type="button"
                    onClick={() => setLocalCounty(n.county || n.name)}
                    className={`flex items-center gap-2 rounded-lg border-2 bg-white px-3 py-2 text-left text-sm transition ${
                      selected
                        ? "border-brand-red shadow ring-2 ring-brand-red/20"
                        : "border-slate-200 hover:border-brand-red/50"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                        selected ? "border-brand-red bg-brand-red" : "border-slate-300"
                      }`}
                    >
                      {selected && <CheckCircle className="h-3 w-3 text-white" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-brand-navy">{n.name}</p>
                      <p className="truncate text-xs text-slate-500">{n.county}</p>
                    </div>
                  </button>
                );
              })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow">
        <h2 className="mb-2 flex items-center gap-2 font-serif text-xl font-bold text-brand-navy">
          <NewspaperIcon className="h-5 w-5 text-brand-red" />
          Rețeaua MediaExpres — 50 ziare reale, domenii .ro
        </h2>
        <p className="mb-5 text-sm text-slate-600">
          Click pe orice ziar ca să-l vizitezi. Toate sunt indexate Google și pagini cu DA 30+.
        </p>

        {(["Moldova", "Transilvania", "Muntenia", "Banat", "Național"] as const).map((r) => (
          <div key={r} className="mb-5 last:mb-0">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand-navy">
              {r === "Național" ? <Globe className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              {r === "Banat" ? "Banat & Oltenia" : r}{" "}
              <span className="font-normal text-slate-400">({grouped[r].length})</span>
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[r].map((n) => (
                <a
                  key={n.url}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition hover:border-brand-red hover:bg-white hover:shadow"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-navy group-hover:text-brand-red">
                      {n.name}
                    </p>
                    {n.city && (
                      <p className="truncate text-xs text-slate-500">{n.city}</p>
                    )}
                  </div>
                  <ExternalLink className="ml-2 h-4 w-4 flex-shrink-0 text-slate-400 group-hover:text-brand-red" />
                </a>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="sticky bottom-4 z-10 rounded-2xl border-2 border-brand-red bg-white p-5 shadow-2xl">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Alegerea ta</p>
            <p className="font-serif text-lg font-bold text-brand-navy">
              {selectedPkgData.name}
              {pkg === "regional" && ` — ${REGIONS_INFO.find((r) => r.id === region)?.label}`}
              {pkg === "local" && localCounty && ` — ${localCounty}`}
            </p>
            <p className="text-2xl font-bold text-brand-red">
              {finalPrice.toLocaleString("ro")} RON
            </p>
          </div>
          {view === "main" && (
            <button
              type="button"
              onClick={() => (window.location.href = continueHref)}
              disabled={pkg === "local" && !localCounty}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-6 py-4 text-base font-bold text-white shadow-lg transition hover:bg-brand-red/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Rocket className="h-5 w-5" />
              Public ACUM
            </button>
          )}
        </div>
        {pkg === "local" && !localCounty && (
          <p className="mt-3 text-center text-sm text-amber-700">
            ↑ Alege un județ mai sus pentru a continua
          </p>
        )}
      </section>

      {view === "sent" && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <p className="text-3xl">✅</p>
          <h3 className="mt-3 font-serif text-xl font-bold text-brand-navy">
            Întrebarea a fost trimisă, {firstName}!
          </h3>
          <p className="mt-2 text-slate-600">Îți răspundem pe email în câteva ore.</p>
        </div>
      )}

      {view === "later" && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-8 text-center">
          <p className="text-3xl">💙</p>
          <h3 className="mt-3 font-serif text-xl font-bold text-brand-navy">
            Nicio problemă, {firstName}!
          </h3>
          <p className="mt-2 text-slate-600">
            Această pagină rămâne activă 90 de zile. Revino când ești gata.
          </p>
        </div>
      )}

      {view === "question" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow">
          <h3 className="font-serif text-xl font-bold text-brand-navy">Scrie întrebarea ta</h3>
          <p className="mt-1 text-sm text-slate-500">
            Îți răspundem pe email în câteva ore.
          </p>
          <textarea
            className="mt-4 min-h-[120px] w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-brand-red focus:outline-none"
            placeholder="Ex: Pot trimite un articol în engleză? Pot plăti în rate?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={sendQuestion}
              disabled={loading || !question.trim()}
              className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-semibold text-white transition hover:bg-brand-red/90 disabled:opacity-50"
            >
              {loading ? "Se trimite..." : "Trimite întrebarea"}
            </button>
            <button
              onClick={() => setView("main")}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm text-slate-600 hover:bg-slate-50"
            >
              Înapoi
            </button>
          </div>
        </div>
      )}

      {view === "main" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setView("question")}
            className="flex items-center gap-3 rounded-2xl border-2 border-brand-navy bg-white p-4 text-brand-navy shadow transition hover:bg-slate-50"
          >
            <MessageCircle className="h-6 w-6 flex-shrink-0" />
            <div className="text-left">
              <p className="font-bold">Am o întrebare</p>
              <p className="text-xs text-slate-500">Răspuns pe email</p>
            </div>
          </button>
          <button
            onClick={() => setView("later")}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-600 transition hover:bg-slate-50"
          >
            <Clock className="h-6 w-6 flex-shrink-0" />
            <div className="text-left">
              <p className="font-semibold">Mă gândesc</p>
              <p className="text-xs text-slate-400">Pagina rămâne activă 90 zile</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
