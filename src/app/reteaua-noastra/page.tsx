import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, Newspaper, Facebook, Globe, FileDown } from "lucide-react";
import { RequestListModal } from "@/components/forms/RequestListModal";
import { REGION_COUNTS } from "@/data/newspapers";
import { CountyGrid } from "@/components/CountyGrid";
import { NewspaperDirectory } from "@/components/NewspaperDirectory";

export const metadata: Metadata = {
  title: "Rețeaua noastră de ziare",
  description:
    "Lista completă a celor 50 de ziare MediaExpres: 41 locale + 9 naționale, cu link către fiecare publicație. Plus 50 pagini Facebook asociate.",
  alternates: { canonical: "/reteaua-noastra" },
  // Pagina e in sitemap si e continutul unic al retelei — trebuie indexata.
  // Avea noindex din perioada in care lista era ascunsa dupa formular.
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
            Rețeaua MediaExpres înseamnă <strong className="text-white">50 de ziare online
            proprii</strong> — 41 locale, câte unul pentru fiecare județ, și 9 naționale —
            fiecare cu pagina lui de Facebook. Cu ajutorul jurnaliștilor din toată țara,
            în rețea se publică <strong className="text-white">peste 1.200 de articole în
            fiecare zi</strong> — site-uri vii, cu trafic real, pe care le poți deschide
            chiar acum, mai jos.
          </p>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Newspaper} value={`${REGION_COUNTS.Național + REGION_COUNTS.Moldova + REGION_COUNTS.Transilvania + REGION_COUNTS.Muntenia + REGION_COUNTS.Banat}+`} label="ziare proprii" />
            <StatCard icon={Facebook} value="50" label="pagini Facebook asociate" />
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
                  Publicații naționale cu trafic constant și articole noi în fiecare zi, incluse în pachetul{" "}
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

          <div className="mt-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Transparență totală</p>
              <h2 className="h2 mt-2">Lista completă a ziarelor</h2>
              <p className="lead mt-4">
                Nu cumperi pe încredere. Astea sunt publicațiile — dă click pe
                oricare și convinge-te că sunt reale.
              </p>
            </div>
            <div className="mt-10">
              <NewspaperDirectory />
            </div>

            {/*
              Momentul de maxima convingere: omul tocmai a parcurs toate cele 50
              de publicatii si s-a lamurit ca exista. Pana acum singurul buton de
              pe intreaga pagina era "Primeste lista pe email" — asa ca oricine
              ajungea aici convins nu avea ce sa faca decat sa-si lase adresa.
              De-aia veneau numai cereri de lista si nicio comanda: comanda nu
              era oferita nicaieri.
            */}
            <div className="mt-12 rounded-2xl border-2 border-brand-red bg-brand-red/5 p-8 text-center md:p-12">
              <h3 className="font-serif text-2xl font-bold text-brand-navy md:text-3xl">
                Le-ai văzut. Articolul tău poate fi în toate, azi.
              </h3>
              <p className="mx-auto mt-4 max-w-xl text-slate-600">
                Publicare în maximum 12 ore lucrătoare, în toate cele 50 de ziare de mai sus.
                Primești raportul cu fiecare link și factură fiscală. Plătești cu cardul sau
                prin ordin de plată.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {/* accent = rosu, aceeasi culoare ca butonul de comanda din
                    restul site-ului; default e navy si s-ar citi ca secundar. */}
                <Button asChild variant="accent" size="lg">
                  <Link href="/oferta-500">Comandă acum — 500 lei →</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/pachete">Vezi toate pachetele</Link>
                </Button>
              </div>
              <p className="mt-5 text-sm text-slate-500">
                Preț de listă 1.500 lei. Oferta de intrare e 500 lei — adică 10 lei pe ziar.
              </p>
            </div>
          </div>

          {/*
            Secundar, nu principal: lista e deja vizibila mai sus, deci asta e
            doar pentru cine vrea s-o pastreze sau s-o arate cuiva. Cand era
            singurul indemn de pe pagina, fura toti oamenii deja convinsi.
          */}
          <div className="mt-16 rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="flex items-center justify-center gap-2 font-semibold text-brand-navy">
              <FileDown className="h-4 w-4 text-brand-gold" />
              Vrei lista în PDF?
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
              Lasă-ne adresa de email și primești imediat lista în PDF, cu link către
              fiecare ziar și specificațiile articolului — documentul pe care îl poți
              trimite mai departe colegilor sau șefului.
            </p>
            <div className="mt-4">
              <RequestListModal
                trigger={
                  <Button variant="outline">
                    <FileDown className="h-4 w-4" /> Primește lista în PDF
                  </Button>
                }
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              PDF-ul ajunge pe email și îl poți descărca și direct, pe ecranul următor.
            </p>
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
