import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  CheckCircle2,
  Newspaper,
  Facebook,
  Clock,
  FileText,
  Shield,
  Link2,
  Award,
  Globe2,
} from "lucide-react";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { verifyProspectToken } from "@/lib/prospect-token";
import { EXISTING_PARTNERS } from "@/data/social-proof";
import {
  STANDARD_PACKAGES,
  CASINO_PACKAGES,
  SUBSCRIPTION_PLANS,
} from "@/data/packages";
import { NEWSPAPERS } from "@/data/newspapers";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Oferta personalizata - MediaExpres",
  robots: { index: false, follow: false },
};

type Variant = "pr-agency" | "casino" | "standard";

function detectVariant(industry: string | null | undefined): Variant {
  const s = (industry || "").toLowerCase();
  if (
    s.includes("agentie pr") ||
    s.includes("agenție pr") ||
    s.includes("comunicare") ||
    s.includes("relatii publice") ||
    s.includes("relații publice") ||
    s.includes(" pr ") ||
    s.startsWith("pr ")
  ) {
    return "pr-agency";
  }
  if (
    s.includes("cazino") ||
    s.includes("casino") ||
    s.includes("pariuri") ||
    s.includes("igaming") ||
    s.includes("gambling")
  ) {
    return "casino";
  }
  return "standard";
}

export default async function ProspectOfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = verifyProspectToken(token);
  if (!decoded) notFound();

  const [prospect] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, decoded.prospectId))
    .limit(1);
  if (!prospect) notFound();

  const variant = detectVariant(prospect.industry);
  const isCasino = variant === "casino";
  const isPRAgency = variant === "pr-agency";

  const headline = isPRAgency
    ? "Program de partener - distribuie la cost"
    : isCasino
    ? "Distributie cazino - ONJN-compliant"
    : "Distributie comunicat - 50 ziare romanesti";

  const subhead = isPRAgency
    ? "PDF white-label, factura consolidata lunar, pret de partener -25% default cu bonus volum pana la -35%. Tu iti pastrezi marja, noi facem distributia."
    : isCasino
    ? "Pachete dedicate operatorilor de iGaming si pariuri sportive. Conformitate ONJN, mentiuni risk-free, raport complet."
    : "Articolul tau publicat pe 41 ziare locale + 9 nationale + distribuit pe 50 pagini Facebook. Raport cu toate linkurile in 12 ore de la publicare.";

  const featured = isCasino
    ? {
        name: "Cazino National",
        price: "2500 RON",
        reach: "50 ziare + 50 pagini Facebook",
      }
    : isPRAgency
    ? {
        name: "National 50 (pret partener -25%)",
        price: "1125 RON / articol",
        reach: "50 ziare + factura consolidata lunar",
      }
    : {
        name: "National 50",
        price: "1500 RON",
        reach: "41 ziare locale + 9 nationale + 50 pagini Facebook",
      };

  const packageSet = isCasino ? CASINO_PACKAGES : STANDARD_PACKAGES;

  const localPapers = NEWSPAPERS.filter((n) => n.type === "local");
  const nationalPapers = NEWSPAPERS.filter((n) => n.type === "national");
  const byRegion = {
    Moldova: localPapers.filter((n) => n.region === "Moldova"),
    Transilvania: localPapers.filter((n) => n.region === "Transilvania"),
    Muntenia: localPapers.filter((n) => n.region === "Muntenia"),
    Banat: localPapers.filter((n) => n.region === "Banat"),
  };

  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="container py-16 md:py-20">
          <p className="eyebrow text-brand-gold">Oferta personalizata</p>
          <h1 className="h1 mt-3 text-white">
            Buna{prospect.contactName ? `, ${prospect.contactName}` : ""}!
          </h1>
          <p className="lead mt-4 max-w-2xl text-white/85">
            Am pregatit pentru{" "}
            <strong className="text-brand-gold">{prospect.companyName}</strong>{" "}
            oferta de mai jos. {subhead}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs text-brand-gold">
            <Clock className="h-3 w-3" /> Raport in 12 ore de la publicare
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <p className="eyebrow">{headline}</p>
          <h2 className="h2 mt-2">Pachet recomandat pentru voi</h2>

          <div className="mt-8 rounded-2xl bg-brand-navy p-8 text-white">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <p className="eyebrow text-brand-gold">Recomandat</p>
                <h3 className="mt-2 font-serif text-3xl font-bold text-white">
                  {featured.name}
                </h3>
                <p className="mt-1 text-white/80">{featured.reach}</p>
              </div>
              <div className="font-serif text-5xl font-bold text-brand-gold">
                {featured.price}
              </div>
            </div>

            <ul className="mt-6 grid gap-2 md:grid-cols-2 text-white/90">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />
                1 articol publicat pe 50 de ziare
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />
                AI redacteaza articolul din tematica voastra
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />
                Distributie automata pe 50 pagini Facebook
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />
                Raport PDF cu toate linkurile in 12 ore
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />
                50 backlinks SEO permanente
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />
                Articol permanent online
              </li>
              {isCasino && (
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />
                  Mentiune ONJN-compliant pe fiecare articol
                </li>
              )}
              {isPRAgency && (
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />
                  Factura consolidata lunar pentru toti clientii vostri
                </li>
              )}
            </ul>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild variant="gold" size="lg">
                <Link href={`/oferta/${token}/comanda`}>
                  DA, vreau acest pachet →
                </Link>
              </Button>
              <a
                href={`mailto:contact@mediaexpress.ro?subject=${encodeURIComponent(
                  `Intrebare oferta ${prospect.companyName}`
                )}`}
                className="inline-flex items-center justify-center rounded-md border border-white/30 px-6 py-3 text-sm text-white hover:bg-white/10"
              >
                Intrebari? Raspundem pe email
              </a>
            </div>

            <p className="mt-6 text-xs text-white/60">
              Dupa click pe DA, completezi: date firma (CUI, adresa) + tematica articolului
              (1-2 propozitii, AI scrie restul) + 3 poze relevante. In 12 ore primesti raportul.
            </p>
          </div>
        </div>
      </section>

      <section className="section bg-white pt-0">
        <div className="container">
          <p className="eyebrow">Ce primiti concret</p>
          <h2 className="h2 mt-2">Beneficiile pachetului National 50</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <GainCard
              icon={Globe2}
              title="Acoperire larga"
              desc="Articolul apare simultan pe 50 site-uri romanesti + 50 pagini Facebook (41 locale + 9 nationale)"
            />
            <GainCard
              icon={Award}
              title="Aparitie redactionala"
              desc="Articolul apare ca stire jurnalistica, NU ca reclama platita. Mult mai credibil decat un banner."
            />
            <GainCard
              icon={Link2}
              title="50 backlinks permanente"
              desc="Linkuri din 50 site-uri reale de presa. Indexabile in Google. Raman online ani de zile."
            />
            <GainCard
              icon={FileText}
              title="Zero efort la voi"
              desc="AI scrie articolul din 1-2 propozitii. Voi trimiteti 3 poze. Restul facem noi. Raport in 12h."
            />
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="container">
          <p className="eyebrow">Toate optiunile</p>
          <h2 className="h2 mt-2">
            {isCasino ? "Pachete cazino disponibile" : "Pachete disponibile"}
          </h2>
          <p className="lead mt-3 text-slate-600">
            Daca pachetul recomandat e prea mare, ai si alternative mai mici. Toate includ raport PDF,
            distributie Facebook si backlinks permanente.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {packageSet.map((pkg) => (
              <div
                key={pkg.id}
                className={`rounded-xl border bg-white p-6 ${
                  pkg.featured
                    ? "border-brand-red shadow-lg"
                    : "border-slate-200"
                }`}
              >
                {pkg.featured && (
                  <span className="inline-block rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-white">
                    {pkg.badge || "Cel mai popular"}
                  </span>
                )}
                <h3 className="mt-3 font-serif text-2xl font-bold text-brand-navy">
                  {pkg.name}
                </h3>
                <p className="text-sm text-slate-500">{pkg.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-serif text-4xl font-bold text-brand-navy">
                    {pkg.price}
                  </span>
                  <span className="text-sm text-slate-500">RON</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{pkg.reach}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
                  {pkg.highlights.slice(0, 4).map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-red mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/oferta/${token}/comanda?pkg=${pkg.id}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy/90"
                >
                  Alege {pkg.name}
                </Link>
              </div>
            ))}
          </div>

          {!isCasino && !isPRAgency && (
            <div className="mt-10">
              <p className="eyebrow">Abonamente lunare</p>
              <h3 className="font-serif text-xl mt-2 text-brand-navy">
                Pentru clientii care publica recurent (pret per articol mai mic)
              </h3>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Articole/luna</th>
                      <th className="px-4 py-3">Reteaua</th>
                      <th className="px-4 py-3 text-right">Pret</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <tr
                        key={plan.id}
                        className={`border-t border-slate-100 ${
                          plan.featured ? "bg-amber-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-brand-navy">
                          {plan.name}
                          {plan.featured && (
                            <span className="ml-2 text-xs font-normal text-brand-red">
                              recomandat
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {plan.distributionsPerMonth}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          50 ziare per articol
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {plan.priceStandard} RON/luna
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <p className="eyebrow">Acoperire</p>
          <h2 className="h2 mt-2">Reteaua de 50 ziare + 50 pagini Facebook</h2>
          <p className="lead mt-3 text-slate-600">
            Articolul vostru apare simultan pe 50 site-uri romanesti. Numele exacte + URL-urile
            articolelor publicate ajung in raportul PDF in 12 ore de la publicare.
          </p>

          <div className="mt-8">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-brand-red" />
              <h3 className="font-serif text-lg font-bold text-brand-navy">
                9 ziare nationale
              </h3>
              <span className="text-sm text-slate-500">(acoperire nationala)</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {nationalPapers.length} ziare cu trafic national + 1 dedicat diasporei romanesti.
              Lista exacta cu numele si URL-urile - in raportul final.
            </p>
          </div>

          <div className="mt-8">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-brand-red" />
              <h3 className="font-serif text-lg font-bold text-brand-navy">
                41 ziare locale (cate 1 per judet)
              </h3>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <RegionBox
                label="Moldova"
                counties={byRegion.Moldova.map((n) => n.county!).filter(Boolean)}
              />
              <RegionBox
                label="Transilvania"
                counties={byRegion.Transilvania.map((n) => n.county!).filter(Boolean)}
              />
              <RegionBox
                label="Muntenia + Bucuresti"
                counties={byRegion.Muntenia.map((n) => n.county!).filter(Boolean)}
              />
              <RegionBox
                label="Banat + Oltenia"
                counties={byRegion.Banat.map((n) => n.county!).filter(Boolean)}
              />
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
              <Facebook className="h-6 w-6 text-blue-600 shrink-0" />
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-navy">
                  50 pagini Facebook asociate
                </h3>
                <p className="mt-1 text-sm text-slate-700">
                  Fiecare ziar are pagina Facebook proprie. Articolul vostru se distribuie automat
                  in ziua publicarii pe toate cele 50 de pagini.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="container max-w-3xl">
          <p className="eyebrow">De ce noi</p>
          <h2 className="h2 mt-2">Parteneri si colaboratori activi</h2>
          <p className="lead mt-4">Distribuim recurent pentru:</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {EXISTING_PARTNERS.map((p) => (
              <span
                key={p.name}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-brand-navy"
              >
                {p.name}
              </span>
            ))}
          </div>
          <p className="mt-8 flex items-start gap-2 text-sm text-slate-500">
            <Shield className="h-4 w-4 mt-0.5 shrink-0 text-brand-red" />
            Plata se face DUPA publicare, pe baza facturii fiscale emise cu CUI-ul firmei voastre.
            Fara plata in avans, fara proforma.
          </p>
        </div>
      </section>

      <section className="bg-brand-navy text-white">
        <div className="container py-16 text-center">
          <h2 className="h2 text-white">Gata sa comanzi?</h2>
          <p className="lead mt-4 mx-auto max-w-2xl text-white/85">
            Completezi datele firmei + tematica articolului + 3 poze. AI redacteaza, noi publicam,
            si primesti raportul cu toate linkurile in 12 ore.
          </p>
          <div className="mt-8">
            <Button asChild variant="gold" size="lg">
              <Link href={`/oferta/${token}/comanda`}>
                Continua spre comanda →
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function GainCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <Icon className="h-7 w-7 text-brand-red" />
      <h3 className="mt-3 font-serif text-lg font-bold text-brand-navy">
        {title}
      </h3>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
    </div>
  );
}

function RegionBox({ label, counties }: { label: string; counties: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
        {label}
      </p>
      <p className="text-xs text-slate-400">{counties.length} judete</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {counties.map((c) => (
          <span
            key={c}
            className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
