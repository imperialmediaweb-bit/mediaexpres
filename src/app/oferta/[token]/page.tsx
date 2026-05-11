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
} from "lucide-react";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { verifyProspectToken } from "@/lib/prospect-token";
import { EXISTING_PARTNERS } from "@/data/social-proof";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ofertă personalizată — MediaExpres",
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

  const headline =
    variant === "pr-agency"
      ? "Program de partener — distribuție la cost"
      : variant === "casino"
      ? "Distribuție cazino — ONJN-compliant"
      : "Distribuție comunicat — 50 ziare româneşti";

  const subhead =
    variant === "pr-agency"
      ? "PDF white-label, factură consolidată lunar, preț de partener -25–30%. Tu îți păstrezi marja, noi facem distribuția."
      : variant === "casino"
      ? "Pachete dedicate operatorilor de iGaming și pariuri sportive. Conformitate ONJN, mențiuni risk-free, raport complet."
      : "Articolul tău publicat pe 41 ziare locale + 9 naționale + distribuit pe 50 pagini Facebook. Raport cu toate linkurile în 12 ore de la publicare.";

  const featured =
    variant === "casino"
      ? {
          name: "Cazino Național",
          price: "2500 RON",
          reach: "50 ziare + 50 pagini Facebook",
        }
      : variant === "pr-agency"
      ? {
          name: "Național 50 (preț partener)",
          price: "1125 RON / articol",
          reach: "50 ziare + factură consolidată lunar (-25%)",
        }
      : {
          name: "Național 50",
          price: "1500 RON",
          reach: "41 ziare locale + 9 naționale + 50 pagini Facebook",
        };

  return (
    <>
      {/* Hero personalizat */}
      <section className="bg-brand-navy text-white">
        <div className="container py-16 md:py-20">
          <p className="eyebrow text-brand-gold">Ofertă personalizată</p>
          <h1 className="h1 mt-3 text-white">
            Bună{prospect.contactName ? `, ${prospect.contactName}` : ""}!
          </h1>
          <p className="lead mt-4 max-w-2xl text-white/85">
            Am pregătit pentru{" "}
            <strong className="text-brand-gold">{prospect.companyName}</strong>{" "}
            oferta de mai jos. {subhead}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs text-brand-gold">
            <Clock className="h-3 w-3" /> Raport în 12 ore de la publicare
          </div>
        </div>
      </section>

      {/* Pachet recomandat */}
      <section className="section bg-white">
        <div className="container">
          <p className="eyebrow">{headline}</p>
          <h2 className="h2 mt-2">Pachet recomandat</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 rounded-2xl bg-brand-navy p-8 text-white">
              <p className="eyebrow text-brand-gold">Recomandat pentru voi</p>
              <h3 className="mt-3 font-serif text-3xl font-bold text-white">
                {featured.name}
              </h3>
              <p className="mt-2 text-white/80">{featured.reach}</p>
              <div className="mt-6 font-serif text-5xl font-bold text-brand-gold">
                {featured.price}
              </div>

              <ul className="mt-6 space-y-2 text-white/90">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" /> 1
                  articol publicat pe 50 de ziare
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />{" "}
                  AI redactează articolul — voi trimiteți doar tematica
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />{" "}
                  Distribuție automată pe 50 pagini Facebook
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />{" "}
                  Raport PDF cu toate linkurile în 12 ore
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />{" "}
                  50 backlinks SEO permanente
                </li>
                {variant === "casino" && (
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />{" "}
                    Mențiune ONJN-compliant pe fiecare articol
                  </li>
                )}
                {variant === "pr-agency" && (
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold" />{" "}
                    Factură consolidată lunar pentru toți clienții voștri
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
                    `Întrebare ofertă ${prospect.companyName}`
                  )}`}
                  className="inline-flex items-center justify-center rounded-md border border-white/30 px-6 py-3 text-sm text-white hover:bg-white/10"
                >
                  Întrebări? Răspundem pe email
                </a>
              </div>
            </div>

            <aside className="rounded-2xl border-2 border-slate-200 bg-white p-6">
              <p className="eyebrow">Alternative</p>
              <h3 className="mt-2 font-serif text-xl text-brand-navy">
                Alte pachete
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {variant === "casino" ? (
                  <>
                    <li>
                      <strong>Cazino Regional</strong> — 900 RON · 10 ziare
                      zonale
                    </li>
                    <li>
                      <strong>Cazino Local</strong> — 300 RON · 1 ziar
                      județean
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <strong>Regional</strong> — 500 RON · 10 ziare zonale
                    </li>
                    <li>
                      <strong>Local</strong> — 150 RON · 1 ziar județean
                    </li>
                    <li>
                      <strong>Abonamente lunare</strong> — Bronze · Silver ·
                      Gold · Platinum
                    </li>
                  </>
                )}
              </ul>
              <p className="mt-6 text-xs text-slate-500">
                Poți alege orice pachet în formularul de comandă.
              </p>
              <Link
                href="/pachete"
                className="mt-4 inline-block text-sm text-brand-red hover:underline"
              >
                Vezi toate pachetele →
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {/* Ce primesc */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={Newspaper}
              title="50 ziare româneşti"
              desc="41 locale (câte unul pe județ) + 9 naționale + 1 dedicat diasporei"
            />
            <FeatureCard
              icon={Facebook}
              title="50 pagini Facebook"
              desc="Distribuție automată pe paginile asociate (300–10.000 urmăritori fiecare)"
            />
            <FeatureCard
              icon={FileText}
              title="Raport PDF în 12 ore"
              desc="Toate URL-urile articolelor + screenshot-uri publicare"
            />
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="section bg-white">
        <div className="container max-w-3xl">
          <p className="eyebrow">De ce noi</p>
          <h2 className="h2 mt-2">Parteneri și colaboratori activi</h2>
          <p className="lead mt-4">Distribuim în mod recurent pentru:</p>
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
            Plata se face DUPĂ publicare, pe baza facturii fiscale emise cu
            CUI-ul firmei voastre. Fără plată în avans, fără proforma.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-brand-navy text-white">
        <div className="container py-16 text-center">
          <h2 className="h2 text-white">Gata să comanzi?</h2>
          <p className="lead mt-4 mx-auto max-w-2xl text-white/85">
            Completezi datele firmei + tematica articolului → noi publicăm și
            îți trimitem raportul cu linkurile + factura în 12 ore.
          </p>
          <div className="mt-8">
            <Button asChild variant="gold" size="lg">
              <Link href={`/oferta/${token}/comanda`}>
                Continuă spre comandă →
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <Icon className="h-8 w-8 text-brand-red" />
      <h3 className="mt-4 font-serif text-xl font-bold text-brand-navy">
        {title}
      </h3>
      <p className="mt-2 text-slate-600">{desc}</p>
    </div>
  );
}
