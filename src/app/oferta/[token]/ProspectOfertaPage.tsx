import Link from "next/link";
import { CheckCircle2, Newspaper, Users, Clock, Star } from "lucide-react";
import { STANDARD_PACKAGES } from "@/data/packages";
import { TESTIMONIALS } from "@/data/testimonials";
import { EXISTING_PARTNERS } from "@/data/social-proof";
import { NEWSPAPERS } from "@/data/newspapers";
import { DiscountCountdown } from "./DiscountCountdown";
import type { prospects } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm/table";

type Prospect = InferSelectModel<typeof prospects>;

interface Props {
  token: string;
  prospect: Prospect;
}

const isAgency = (industry: string | null) =>
  !!industry && /agenti[ae]|pr|comunicare|marketing|media/i.test(industry);

export function ProspectOfertaPage({ token, prospect }: Props) {
  const agency = isAgency(prospect.industry);
  const firstName = (prospect.contactName || prospect.companyName).split(/[\s,]/)[0];
  const cmdLink = `/oferta/${token}/comanda`;

  const packages = STANDARD_PACKAGES.map((pkg) => ({
    ...pkg,
    displayPrice: agency ? Math.round(pkg.price * 0.75) : pkg.price,
  }));

  const nationalPkg = packages.find((p) => p.id === "national");
  const sampleNewspapers = NEWSPAPERS.slice(0, 12);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F5F0] to-white">
      {/* Hero */}
      <div className="bg-brand-navy text-white py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <span className="inline-block rounded-full bg-brand-gold/20 px-4 py-1 text-sm font-semibold text-brand-gold mb-4">
            Ofertă personalizată
          </span>
          <h1 className="font-serif text-3xl font-bold md:text-4xl">
            MediaExpres &times; <span className="text-brand-gold">{prospect.companyName}</span>
          </h1>
          <p className="mt-3 text-white/80 max-w-2xl mx-auto">
            Distribuim comunicatele de presă pe <strong>50 de ziare online</strong> din România
            cu raport PDF livrat în 24h. Tu trimiți tematica, noi scriem şi publicăm.
          </p>
          {agency && (
            <div className="mt-4 inline-block rounded-lg bg-brand-gold/20 border border-brand-gold/40 px-4 py-2 text-sm font-medium text-brand-gold">
              🤝 Preț partener agenție: <strong>-25%</strong> la toate pachetele
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 space-y-16">
        {/* Why it works */}
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          <div className="rounded-xl bg-white border border-slate-200 p-6">
            <Clock className="h-7 w-7 text-brand-red mx-auto mb-3" />
            <p className="font-semibold text-brand-navy">Publicare în 24h</p>
            <p className="text-xs text-slate-500 mt-1">Trimiți azi, eşti online mâine</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-6">
            <Newspaper className="h-7 w-7 text-brand-red mx-auto mb-3" />
            <p className="font-semibold text-brand-navy">50 ziare simultan</p>
            <p className="text-xs text-slate-500 mt-1">Acoperire națională într-un singur click</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-6">
            <Users className="h-7 w-7 text-brand-red mx-auto mb-3" />
            <p className="font-semibold text-brand-navy">AI scrie articolul</p>
            <p className="text-xs text-slate-500 mt-1">Tu trimiți doar tematica + 3 poze</p>
          </div>
        </div>

        {/* Packages */}
        <div>
          <h2 className="font-serif text-2xl font-bold text-brand-navy mb-2">Pachetele noastre</h2>
          <p className="text-slate-600 mb-6 text-sm">
            {agency
              ? `Prețuri speciale partener agenție (-25%) aplicate automat pentru ${prospect.companyName}.`
              : "Alege pachetul potrivit obiectivelor tale de comunicare."}
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`rounded-xl border p-5 ${
                  pkg.id === "national"
                    ? "border-brand-red bg-brand-red/5 ring-2 ring-brand-red"
                    : "border-slate-200 bg-white"
                }`}
              >
                {pkg.id === "national" && (
                  <span className="inline-block rounded-full bg-brand-red text-white text-xs px-3 py-0.5 mb-2 font-semibold">
                    ★ Cel mai popular
                  </span>
                )}
                <p className="font-serif font-bold text-brand-navy text-lg">{pkg.name}</p>
                <p className="text-2xl font-bold text-brand-red mt-1">
                  {pkg.displayPrice.toLocaleString("ro")} RON
                  {agency && pkg.displayPrice < pkg.price && (
                    <span className="ml-2 text-sm line-through text-slate-400">
                      {pkg.price.toLocaleString("ro")}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{pkg.reach}</p>
                <ul className="mt-3 space-y-1">
                  {pkg.highlights.slice(0, 3).map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {nationalPkg && (
            <div className="mt-6 rounded-xl bg-green-50 border border-green-200 p-5">
              <p className="font-semibold text-green-800 text-sm">
                💡 Cu <strong>Pachetul Național 50</strong> ({nationalPkg.displayPrice.toLocaleString("ro")} RON) primeşti:
              </p>
              <ul className="mt-2 grid sm:grid-cols-2 gap-1.5">
                {[
                  "50 articole publicate simultan",
                  "AI scrie comunicatul — tu trimiți tematica",
                  "Raport PDF cu toate URL-urile",
                  "50 backlinks permanente → +SEO",
                  "Distribuție pe Facebook a fiecărui ziar",
                  "Factură fiscală după publicare",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sample newspapers */}
        <div>
          <h2 className="font-serif text-2xl font-bold text-brand-navy mb-2">
            Câteva ziare din rețeaua noastră
          </h2>
          <p className="text-slate-600 mb-4 text-sm">
            50 de publicații online regionale şi naționale cu audiențe locale reale.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {sampleNewspapers.map((n, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <Newspaper className="h-3.5 w-3.5 text-brand-red shrink-0" />
                <span className="font-medium text-brand-navy truncate">{n.name}</span>
                {n.county && <span className="text-xs text-slate-400 ml-auto shrink-0">{n.county}</span>}
              </div>
            ))}
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
              + {NEWSPAPERS.length - sampleNewspapers.length} altele...
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div>
          <h2 className="font-serif text-2xl font-bold text-brand-navy mb-6">Ce spun clienții</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="rounded-xl bg-white border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-full bg-brand-navy text-white flex items-center justify-center text-xs font-bold">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.company}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-2">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3 w-3 fill-brand-gold text-brand-gold" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 italic">&ldquo;{t.quote}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>

        {/* Partners */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Lucrăm deja cu
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {EXISTING_PARTNERS.map((p, i) => (
              <span
                key={i}
                className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>

        {/* Urgency discount countdown */}
        {prospect.discountCode && prospect.discountExpiresAt && (
          <DiscountCountdown
            code={prospect.discountCode}
            expiresAt={prospect.discountExpiresAt.toISOString()}
          />
        )}

        {/* CTA */}
        <div className="rounded-2xl bg-brand-navy text-white p-8 text-center">
          <h2 className="font-serif text-2xl font-bold mb-2">
            Gata să publicăm pentru {prospect.companyName}?
          </h2>
          <p className="text-white/75 text-sm mb-6 max-w-lg mx-auto">
            Click pe buton, completezi datele firmei + tematica (2 minute),
            noi scriem comunicatul cu AI şi publicăm pe 50 de ziare în 24h.
            Factura fiscală pe email după publicare.
          </p>
          <Link
            href={cmdLink}
            className="inline-block rounded-xl bg-brand-red hover:bg-brand-red/90 text-white font-bold text-lg px-10 py-4 transition"
          >
            Vreau să public acum →
          </Link>
          <p className="mt-4 text-xs text-white/50">
            Fără plată în avans &bull; Fără telefon &bull; Fără proformă &bull; Factură după publicare
          </p>
        </div>
      </div>
    </div>
  );
}
