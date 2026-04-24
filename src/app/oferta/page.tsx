import type { Metadata } from "next";
import {
  Mail,
  Newspaper,
  Facebook,
  Link as LinkIcon,
  CheckCircle2,
  Globe,
  FileText,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestListModal } from "@/components/forms/RequestListModal";

export const metadata: Metadata = {
  title: "Ofertă publicare advertoriale și comunicate",
  description:
    "Publicare advertoriale și comunicate într-o rețea de 50+ ziare online, 41 ziare locale și 9 ziare naționale. Acoperire locală și națională într-un singur plasament.",
  alternates: { canonical: "/oferta" },
};

const BENEFITS = [
  {
    icon: Newspaper,
    title: "Publicare în 50+ ziare online",
    description:
      "Advertorial sau comunicat distribuit într-o rețea extinsă, cu audiențe între 10.000 și 40.000 vizitatori unici pe lună per publicație și peste 320.000 total.",
  },
  {
    icon: Globe,
    title: "41 ziare locale — câte unul per județ",
    description:
      "Acoperire locală reală, cu ziare conectate la comunitățile din toate regiunile țării.",
  },
  {
    icon: FileText,
    title: "9 ziare naționale + 1 pentru diaspora",
    description:
      "Expunere națională și conectare cu comunitățile românești din afara țării.",
  },
  {
    icon: Facebook,
    title: "Distribuire pe paginile de Facebook",
    description:
      "Fiecare platformă are o pagină Facebook cu 300–10.000 urmăritori, pentru expunere suplimentară pe social media.",
  },
  {
    icon: LinkIcon,
    title: "Backlink-uri pe platforme cu DA 37+",
    description:
      "Linkuri dofollow de pe domenii cu autoritate ridicată — ajută la SEO și la autoritatea brandului.",
    wide: true,
  },
];

const CONDITIONS = [
  "Articol permanent pe site-ul nostru.",
  "O zi de expunere pe pagina principală.",
  "Distribuire pe paginile noastre de Facebook.",
  "3 poze și 3 linkuri dofollow incluse.",
  "Servicii de redactare articole — la cerere.",
  "Acceptăm orice tip de conținut.",
  "Nu adăugăm eticheta (P) la articole.",
];

export default function OfertaPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-navy text-white">
        <div className="container py-20 text-center">
          <p className="eyebrow text-brand-gold">Ofertă publicare</p>
          <h1 className="h1 mt-3 text-white">
            Advertoriale și comunicate în 50+ ziare românești
          </h1>
          <p className="lead mx-auto mt-6 max-w-2xl text-white/85">
            Rețea de 50+ ziare online, 41 ziare locale (câte unul pentru
            fiecare județ), 9 ziare naționale și 1 ziar dedicat diasporei.
            Vizibilitate locală și națională într-un singur plasament.
          </p>
          <div className="mt-8">
            <RequestListModal
              successHref="/pachete"
              successCtaLabel="Vezi prețurile acum"
              trigger={
                <Button variant="gold" size="lg">
                  <Mail className="h-4 w-4" /> Cere lista ziarelor și
                  prețurile
                </Button>
              }
            />
          </div>
          <p className="mt-4 text-xs text-white/60">
            PDF gratuit pe email • lista celor 50+ publicații • zero spam
          </p>
        </div>
      </section>

      {/* Coverage */}
      <section className="section bg-white">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Newspaper}
              value="50+"
              label="ziare online, 10–40k vizitatori unici/lună, 320k+ total"
            />
            <StatCard
              icon={Globe}
              value="41"
              label="ziare locale, câte unul pentru fiecare județ"
            />
            <StatCard
              icon={FileText}
              value="9 + 1"
              label="ziare naționale + ziar dedicat diasporei"
            />
            <StatCard
              icon={Facebook}
              value="300–10k"
              label="urmăritori per pagină Facebook asociată"
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="max-w-2xl">
            <p className="eyebrow">Ce include oferta</p>
            <h2 className="h2 mt-2">Ce primești la fiecare publicare</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className={`rounded-xl border border-slate-200 bg-white p-6 ${
                  b.wide ? "md:col-span-2" : ""
                }`}
              >
                <b.icon className="h-8 w-8 text-brand-red" />
                <h3 className="mt-4 font-serif text-xl font-bold text-brand-navy">
                  {b.title}
                </h3>
                <p className="mt-3 text-slate-600">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages descriptive — no price CTA, only lead magnet */}
      <section className="section bg-white">
        <div className="container">
          <div className="max-w-2xl text-center mx-auto">
            <p className="eyebrow">Pachete de promovare</p>
            <h2 className="h2 mt-2">Alege acoperirea potrivită</h2>
            <p className="lead mt-4">
              Două variante simple: un singur portal sau întreaga rețea.
              Primești tarifele complete și abonamentele lunare în PDF-ul cu
              lista ziarelor.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <PackageCard
              eyebrow="Pachet individual"
              title="Advertorial / comunicat pe un singur portal"
              points={[
                "Publicare pe un portal online la alegere",
                "Primești linkul direct către articolul publicat",
                "Ideal pentru testarea unei publicații",
              ]}
            />
            <PackageCard
              eyebrow="Rețea 50 portaluri"
              title="Un articol distribuit în toată rețeaua"
              points={[
                "Articolul apare în toate cele 50 de portaluri online",
                "Raport complet cu 50 de linkuri către articolele publicate",
                "Maximum de vizibilitate dintr-un singur plasament",
              ]}
              highlight
            />
          </div>
        </div>
      </section>

      {/* Conditions */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="max-w-2xl">
            <p className="eyebrow">Condiții de publicare</p>
            <h2 className="h2 mt-2">Ce oferim pentru fiecare articol</h2>
          </div>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {CONDITIONS.map((c) => (
              <li
                key={c}
                className="flex items-start gap-3 rounded-xl bg-white p-5 border border-slate-200"
              >
                <CheckCircle2 className="h-5 w-5 text-brand-red shrink-0 mt-0.5" />
                <span className="text-slate-700">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Payment */}
      <section className="section bg-white">
        <div className="container">
          <div className="rounded-2xl border border-slate-200 p-10">
            <div className="flex items-center gap-4">
              <CreditCard className="h-8 w-8 text-brand-red" />
              <h2 className="font-serif text-2xl font-bold text-brand-navy">
                Modalități de plată
              </h2>
            </div>
            <p className="mt-4 text-slate-600">
              Transfer bancar, cu factură fiscală și contract de prestări
              servicii — tot ce îți trebuie pentru contabilitate B2B.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA: single lead magnet */}
      <section className="bg-brand-navy text-white">
        <div className="container py-16 text-center">
          <Mail className="mx-auto h-10 w-10 text-brand-gold" />
          <h2 className="h2 mt-5 text-white">
            Primește lista celor 50+ ziare și prețurile complete
          </h2>
          <p className="lead mt-4 mx-auto max-w-2xl text-white/85">
            PDF gratuit pe email în maximum 2 minute: lista completă a
            publicațiilor, tarifele pe pachet și abonamentele lunare. Fără
            obligații, fără spam.
          </p>
          <div className="mt-8">
            <RequestListModal
              successHref="/pachete"
              successCtaLabel="Vezi prețurile acum"
              trigger={
                <Button variant="gold" size="lg">
                  <Mail className="h-4 w-4" /> Cere oferta pe email
                </Button>
              }
            />
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
      <div className="mt-3 font-serif text-4xl font-bold text-brand-navy">
        {value}
      </div>
      <div className="mt-1 text-sm text-slate-600">{label}</div>
    </div>
  );
}

function PackageCard({
  eyebrow,
  title,
  points,
  highlight = false,
}: {
  eyebrow: string;
  title: string;
  points: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-2xl p-8 bg-brand-navy text-white"
          : "rounded-2xl p-8 border-2 border-slate-200 bg-white"
      }
    >
      <p className={`eyebrow ${highlight ? "text-brand-gold" : ""}`}>
        {eyebrow}
      </p>
      <h3
        className={`mt-3 font-serif text-2xl font-bold ${
          highlight ? "text-white" : "text-brand-navy"
        }`}
      >
        {title}
      </h3>
      <ul
        className={`mt-6 space-y-3 ${
          highlight ? "text-white/90" : "text-slate-600"
        }`}
      >
        {points.map((p) => (
          <li key={p} className="flex items-start gap-3">
            <CheckCircle2
              className={`h-5 w-5 shrink-0 mt-0.5 ${
                highlight ? "text-brand-gold" : "text-brand-red"
              }`}
            />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
