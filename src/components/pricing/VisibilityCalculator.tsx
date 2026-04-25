"use client";

import { useState } from "react";
import { Newspaper, Users, MapPin, Facebook, Link as LinkIcon } from "lucide-react";
import { STANDARD_PACKAGES } from "@/data/packages";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/pricing/CheckoutButton";

// Estimari conservatoare. La 1 ziar local mediu: ~3k cititori/luna.
// 10 ziare regionale: ~30k. 50 ziare national: ~200k (mix locale + nationale cu reach mai mare).
// Plus distributia FB se calculeaza separat.
const REACH_PER_NEWSPAPER = 3000;
const NATIONAL_REACH_BOOST = 4; // ziarele nationale au reach 4x media locala
const FB_PAGES = { 1: 1, 10: 8, 50: 37 };

interface CalcResult {
  packageId: "local" | "regional" | "national";
  packageName: string;
  newspapers: number;
  price: number;
  reach: number;
  fbPages: number;
  countiesCovered: string;
}

function compute(newspapers: number): CalcResult {
  if (newspapers <= 1) {
    return {
      packageId: "local",
      packageName: "Local",
      newspapers: 1,
      price: 150,
      reach: REACH_PER_NEWSPAPER,
      fbPages: FB_PAGES[1],
      countiesCovered: "1 județ la alegere",
    };
  }
  if (newspapers <= 10) {
    return {
      packageId: "regional",
      packageName: "Regional",
      newspapers: 10,
      price: 500,
      reach: REACH_PER_NEWSPAPER * 10,
      fbPages: FB_PAGES[10],
      countiesCovered: "1 zonă geografică (5-8 județe)",
    };
  }
  // National 50: 41 locale (avg) + 9 nationale (4x boost)
  const nationalReach = 41 * REACH_PER_NEWSPAPER + 9 * REACH_PER_NEWSPAPER * NATIONAL_REACH_BOOST;
  return {
    packageId: "national",
    packageName: "Național 50",
    newspapers: 50,
    price: 1500,
    reach: nationalReach,
    fbPages: FB_PAGES[50],
    countiesCovered: "Toată România (41 județe + Buc.)",
  };
}

const formatNum = (n: number) => n.toLocaleString("ro-RO");

export function VisibilityCalculator() {
  const [count, setCount] = useState(50);
  const result = compute(count);
  const pkg = STANDARD_PACKAGES.find((p) => p.id === result.packageId)!;

  return (
    <section className="rounded-2xl border border-brand-red/20 bg-gradient-to-br from-white to-brand-ivory p-6 md:p-10 shadow-sm">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="eyebrow text-brand-red">Calculator vizibilitate</p>
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-brand-navy mt-2">
            Câți oameni îți vor vedea articolul?
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Mută slider-ul ca să vezi reach-ul real pentru fiecare pachet. Estimările sunt conservatoare,
            bazate pe trafic mediu lunar al ziarelor partenere.
          </p>

          <div className="mt-8">
            <label className="flex items-baseline justify-between text-sm font-semibold text-brand-navy">
              <span>Câte ziare?</span>
              <span className="font-serif text-3xl font-bold text-brand-red">
                {result.newspapers}
              </span>
            </label>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-3 w-full accent-brand-red"
              aria-label="Numar de ziare"
            />
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>1 ziar (Local)</span>
              <span>10 ziare (Regional)</span>
              <span>50 (Național)</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-6">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
                Pachet recomandat
              </p>
              <h3 className="mt-1 font-serif text-2xl font-bold text-brand-navy">
                {result.packageName}
              </h3>
            </div>
            <p className="font-serif text-3xl font-bold text-brand-navy">
              {result.price} <span className="text-sm font-medium text-slate-500">lei</span>
            </p>
          </div>

          <ul className="mt-5 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Users className="h-5 w-5 shrink-0 text-brand-red" />
              <div className="flex-1 flex justify-between gap-3">
                <span className="text-slate-600">Cititori estimați / lună</span>
                <span className="font-bold text-brand-navy">~ {formatNum(result.reach)}</span>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <Newspaper className="h-5 w-5 shrink-0 text-brand-red" />
              <div className="flex-1 flex justify-between gap-3">
                <span className="text-slate-600">Ziare</span>
                <span className="font-bold text-brand-navy">{result.newspapers}</span>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <Facebook className="h-5 w-5 shrink-0 text-brand-red" />
              <div className="flex-1 flex justify-between gap-3">
                <span className="text-slate-600">Pagini Facebook</span>
                <span className="font-bold text-brand-navy">{result.fbPages}</span>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-brand-red" />
              <div className="flex-1 flex justify-between gap-3">
                <span className="text-slate-600">Acoperire</span>
                <span className="text-right text-xs font-medium text-brand-navy">
                  {result.countiesCovered}
                </span>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <LinkIcon className="h-5 w-5 shrink-0 text-brand-red" />
              <div className="flex-1 flex justify-between gap-3">
                <span className="text-slate-600">Backlinks SEO</span>
                <span className="font-bold text-brand-navy">{result.newspapers}</span>
              </div>
            </li>
          </ul>

          <div className="mt-6 space-y-2">
            <CheckoutButton
              packageId={pkg.id}
              mode="package"
              label={`Plătește ${result.price} RON cu cardul`}
              variant="accent"
              size="lg"
              className="w-full"
            />
            <Button variant="outline" size="default" className="w-full" asChild>
              <a href={`#${result.packageId}`}>Vezi detaliile pachetului</a>
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            Estimare conservatoare. Reach real poate fi mai mare în funcție de subiectul articolului.
          </p>
        </div>
      </div>
    </section>
  );
}
