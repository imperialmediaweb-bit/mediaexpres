import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { MapPin, Newspaper, Facebook, Globe, Mail } from "lucide-react";
import { RequestListModal } from "@/components/forms/RequestListModal";
import { REGION_COUNTS } from "@/data/newspapers";
import { CountyGrid } from "@/components/CountyGrid";

export const metadata: Metadata = {
  title: "Rețeaua noastră de ziare",
  description: "MediaExpres distribuie pe o rețea națională de 50+ ziare și 37 pagini Facebook.",
  alternates: { canonical: "/reteaua-noastra" },
  robots: { index: false, follow: false },
};

const REGIONS = [
  {
    name: "Moldova",
    count: REGION_COUNTS.Moldova,
    counties: ["Iași", "Bacău", "Botoșani", "Vaslui", "Suceava", "Neamț", "Galați", "Brăila", "Buzău", "Vrancea"],
  },
  {
    name: "Transilvania",
    count: REGION_COUNTS.Transilvania,
    counties: ["Cluj", "Brașov", "Sibiu", "Mureș", "Alba", "Bihor", "Maramureș", "Satu Mare", "Hunedoara", "Sălaj", "Covasna"],
  },
  {
    name: "Muntenia + București",
    count: REGION_COUNTS.Muntenia,
    counties: ["București", "Prahova", "Dâmbovița", "Argeș", "Ilfov", "Giurgiu", "Călărași", "Ialomița", "Teleorman", "Constanța", "Tulcea"],
  },
  {
    name: "Banat + Oltenia",
    count: REGION_COUNTS.Banat,
    counties: ["Timiș", "Arad", "Caraș-Severin", "Dolj", "Gorj", "Mehedinți", "Olt", "Vâlcea"],
  },
];

export default function ReteauaPage() {
  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="container py-20 text-center">
          <p className="eyebrow text-brand-gold">Acoperire națională</p>
          <h1 className="h1 mt-3 text-white">Rețeaua MediaExpres</h1>
          <p className="lead mx-auto mt-6 max-w-2xl text-white/85">
            O rețea solidă de ziare partenere și pagini Facebook, construită în ani pentru a oferi
            clienților noștri maximă vizibilitate națională.
          </p>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Newspaper} value={`${REGION_COUNTS.Național + REGION_COUNTS.Moldova + REGION_COUNTS.Transilvania + REGION_COUNTS.Muntenia + REGION_COUNTS.Banat}+`} label="ziare partenere" />
            <StatCard icon={Facebook} value="37" label="pagini Facebook asociate" />
            <StatCard icon={Globe} value="4" label="regiuni acoperite" />
            <StatCard icon={MapPin} value="35+" label="județe din România" />
          </div>

          <div className="mt-20">
            <div className="max-w-2xl">
              <p className="eyebrow">Distribuția pe regiuni</p>
              <h2 className="h2 mt-2">Acoperire echilibrată în toată țara</h2>
              <p className="lead mt-4">
                Rețeaua include ziare naționale de top + ziare locale din toate regiunile
                istorice ale României. Distribuția geografică asigură expunere echilibrată.
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {REGIONS.map((r) => (
                <div key={r.name} className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl font-bold text-brand-navy">{r.name}</h3>
                    <span className="inline-flex items-center rounded-full bg-brand-red/10 px-3 py-1 text-sm font-semibold text-brand-red">
                      {r.count} ziare
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-slate-600">
                    <strong className="text-brand-navy">Județe acoperite:</strong>{" "}
                    {r.counties.join(" • ")}
                  </p>
                </div>
              ))}
              <div className="rounded-xl border-2 border-brand-gold bg-brand-gold/5 p-6 md:col-span-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl font-bold text-brand-navy">Ziare naționale</h3>
                  <span className="inline-flex items-center rounded-full bg-brand-gold/20 px-3 py-1 text-sm font-semibold text-brand-navy">
                    {REGION_COUNTS.Național} ziare top-tier
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  Publicații naționale cu audiență lunară de ordinul milioanelor, incluse în pachetul{" "}
                  <strong className="text-brand-navy">Național 50</strong> și în toate abonamentele.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-20">
            <div className="max-w-2xl">
              <p className="eyebrow">Acoperire județeană</p>
              <h2 className="h2 mt-2">Toate județele României</h2>
              <p className="lead mt-4">
                Click pe orice județ pentru a vedea pachetele și prețurile pentru
                publicarea unui comunicat de presă în zona respectivă.
              </p>
            </div>
            <div className="mt-10">
              <CountyGrid />
            </div>
          </div>

          <div className="mt-16 rounded-2xl bg-brand-navy p-10 text-white text-center lg:p-16">
            <Mail className="mx-auto h-10 w-10 text-brand-gold" />
            <h3 className="mt-5 font-serif text-3xl font-bold">
              Vrei lista completă a ziarelor partenere?
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-white/85">
              Din respect pentru rețeaua noastră și pentru a o proteja de abuzuri SEO, numele și
              URL-urile exacte ale celor 50 de ziare le trimitem direct pe email după completarea
              unui formular scurt. Gratuit, fără obligații.
            </p>
            <div className="mt-8">
              <RequestListModal
                trigger={
                  <Button variant="gold" size="lg">
                    <Mail className="h-4 w-4" /> Solicită lista completă
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
      <Icon className="mx-auto h-8 w-8 text-brand-red" />
      <div className="mt-3 font-serif text-4xl font-bold text-brand-navy">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{label}</div>
    </div>
  );
}
