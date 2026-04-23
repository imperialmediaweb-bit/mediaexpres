import { MapPin } from "lucide-react";

const REGIONS = [
  { name: "Moldova", counties: 10 },
  { name: "Transilvania", counties: 11 },
  { name: "Muntenia + București", counties: 11 },
  { name: "Banat + Oltenia", counties: 8 },
  { name: "Rețea națională", counties: 9 },
];

export function CoverageBanner() {
  return (
    <section className="bg-brand-ivory border-y border-slate-200">
      <div className="container py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-brand-red" />
            <span className="eyebrow">Acoperire națională</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            {REGIONS.map((r) => (
              <div key={r.name} className="flex items-baseline gap-2">
                <span className="font-serif text-2xl font-bold text-brand-navy">
                  {r.counties}
                </span>
                <span className="text-slate-600">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
