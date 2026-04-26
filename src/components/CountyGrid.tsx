import Link from "next/link";
import { COUNTIES } from "@/data/counties";

const REGION_COLORS: Record<string, string> = {
  Moldova: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900",
  Transilvania: "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900",
  Muntenia: "bg-green-50 hover:bg-green-100 border-green-200 text-green-900",
  Banat: "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900",
  Bucuresti: "bg-brand-red/10 hover:bg-brand-red/20 border-brand-red/30 text-brand-red",
};

const REGIONS_ORDERED = [
  { key: "Moldova" as const, label: "Moldova" },
  { key: "Transilvania" as const, label: "Transilvania" },
  { key: "Muntenia" as const, label: "Muntenia + Dobrogea" },
  { key: "Banat" as const, label: "Banat + Oltenia" },
  { key: "Bucuresti" as const, label: "București" },
];

export function CountyGrid() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 text-xs font-medium">
        {REGIONS_ORDERED.map((r) => (
          <span
            key={r.key}
            className={`rounded-full border px-3 py-1 ${REGION_COLORS[r.key]}`}
          >
            {r.label}
          </span>
        ))}
      </div>

      {REGIONS_ORDERED.map((region) => {
        const items = COUNTIES.filter((c) => c.region === region.key);
        if (items.length === 0) return null;
        return (
          <div key={region.key}>
            <h3 className="font-serif text-lg font-bold text-brand-navy">
              {region.label}
              <span className="ml-2 text-sm font-normal text-slate-500">
                ({items.length} {items.length === 1 ? "județ" : "județe"})
              </span>
            </h3>
            <div className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((c) => (
                <Link
                  key={c.slug}
                  href={`/publicare-comunicat-${c.slug}`}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${REGION_COLORS[c.region]}`}
                >
                  {c.name}
                  <p className="text-xs font-normal opacity-70">{c.capital}</p>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
