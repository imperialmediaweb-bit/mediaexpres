import { Check, Minus } from "lucide-react";
import { CheckoutButton } from "@/components/pricing/CheckoutButton";

const ROWS: Array<{
  label: string;
  values: [string | boolean, string | boolean, string | boolean];
  highlight?: boolean;
}> = [
  { label: "Număr ziare", values: ["1 județean", "10 regionale", "41 locale + 9 naționale"], highlight: true },
  { label: "Cititori estimați / lună", values: ["~3.000", "~30.000", "~250.000+"], highlight: true },
  { label: "Pagini Facebook (distribuție)", values: ["1", "8", "50"] },
  { label: "Backlinks SEO", values: ["1", "10", "50"] },
  { label: "Acoperire geografică", values: ["1 județ", "1 zonă (5-8 jud.)", "Toată România"] },
  { label: "Livrare", values: ["≤ 24h", "≤ 24h", "≤ 24h"] },
  { label: "Articole indexate Google", values: [true, true, true] },
  { label: "Linkuri permanente online", values: [true, true, true] },
  { label: "Raport PDF cu URL-uri", values: ["URL singular", true, "PDF complet 50"] },
  { label: "Apariție pe site-uri naționale", values: [false, false, true] },
  { label: "Recomandare pentru SEO", values: ["Mic", "Mediu", "Optim — toate"] },
  { label: "Recomandare conferințe / lansări", values: [false, "Da", "Da, recomandat"] },
];

const PACKAGES = [
  {
    id: "local" as const,
    name: "Local",
    price: 150,
    pricePerNewspaper: "150 RON / ziar",
    badge: null,
  },
  {
    id: "regional" as const,
    name: "Regional",
    price: 500,
    pricePerNewspaper: "50 RON / ziar",
    badge: "Cel mai bun raport",
  },
  {
    id: "national" as const,
    name: "Național 50",
    price: 1500,
    pricePerNewspaper: "30 RON / ziar",
    badge: "Cel mai popular",
    featured: true,
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-green-600" />;
  if (value === false) return <Minus className="mx-auto h-5 w-5 text-slate-300" />;
  return <span className="text-sm">{value}</span>;
}

export function PackageComparator() {
  return (
    <section id="comparator" className="scroll-mt-24">
      <div className="max-w-3xl">
        <p className="eyebrow">Comparator</p>
        <h2 className="h2 mt-2">Care pachet e potrivit pentru tine?</h2>
        <p className="lead mt-3 text-slate-600">
          Comparație directă pe ce contează: reach, ziare, Facebook, SEO. Pentru aceeași muncă
          de tine, Național 50 îți dă <strong>de peste 80x mai mulți cititori</strong> decât Local.
        </p>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-5 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Caracteristică
              </th>
              {PACKAGES.map((p) => (
                <th
                  key={p.id}
                  className={`px-5 py-5 text-center ${
                    p.featured ? "bg-brand-red/5" : ""
                  }`}
                >
                  <div className="space-y-1">
                    {p.badge && (
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          p.featured
                            ? "bg-brand-red text-white"
                            : "bg-brand-gold/20 text-brand-navy"
                        }`}
                      >
                        {p.badge}
                      </span>
                    )}
                    <h3 className="font-serif text-xl font-bold text-brand-navy">
                      {p.name}
                    </h3>
                    <p className="font-serif text-2xl font-bold text-brand-red">
                      {p.price} lei
                    </p>
                    <p className="text-xs text-slate-500">{p.pricePerNewspaper}</p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr
                key={row.label}
                className={`border-t border-slate-100 ${row.highlight ? "bg-amber-50/30" : ""}`}
              >
                <td className="px-5 py-3 font-medium text-brand-navy">{row.label}</td>
                {row.values.map((v, i) => {
                  const featured = PACKAGES[i]?.featured;
                  return (
                    <td
                      key={i}
                      className={`px-5 py-3 text-center ${
                        featured ? "bg-brand-red/5" : ""
                      } ${row.highlight ? "font-bold text-brand-navy" : "text-slate-700"}`}
                    >
                      <Cell value={v} />
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="px-5 py-5"></td>
              {PACKAGES.map((p) => (
                <td key={p.id} className={`px-5 py-5 ${p.featured ? "bg-brand-red/5" : ""}`}>
                  <CheckoutButton
                    packageId={p.id}
                    mode="package"
                    label={`Plătește ${p.price} RON`}
                    variant={p.featured ? "accent" : "default"}
                    className="w-full"
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        TVA inclus în prețuri. Plată unică prin card sau factură proformă (transfer bancar).
      </p>
    </section>
  );
}
