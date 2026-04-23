import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PricingGroup } from "@/components/pricing/PricingGroup";
import { SubscriptionTable } from "@/components/pricing/SubscriptionTable";
import { PricingNote } from "@/components/pricing/PricingNote";
import { FAQ } from "@/components/home/FAQ";
import { CtaBanner } from "@/components/home/CtaBanner";
import { RequestListModal } from "@/components/forms/RequestListModal";
import { STANDARD_PACKAGES, CASINO_PACKAGES } from "@/data/packages";
import { PackagesStructuredData } from "@/components/seo/StructuredData";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Pachete și prețuri — Distribuție pe 50 ziare românești",
  description:
    "Pachete MediaExpres: Local (150 lei), Regional (500 lei), Național 50 (1500 lei). Variante Cazino/iGaming și abonamente lunare Bronze/Silver/Gold/Platinum.",
  alternates: { canonical: "/pachete" },
};

export default function PacheteTPage() {
  return (
    <>
      <PackagesStructuredData
        packages={[...STANDARD_PACKAGES, ...CASINO_PACKAGES].map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          currency: "RON",
        }))}
      />

      {/* Hero */}
      <section className="bg-brand-navy text-white">
        <div className="container py-20 text-center">
          <p className="eyebrow text-brand-gold">Prețuri transparente</p>
          <h1 className="h1 mt-3 text-white">Pachete pentru fiecare nevoie</h1>
          <p className="lead mx-auto mt-6 max-w-2xl text-white/85">
            De la un singur articol într-un ziar județean, la publicare națională pe 50 de ziare
            sau abonamente lunare. Alege pachetul potrivit afacerii tale.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="gold" size="lg" asChild>
              <a href="#standard">Pachete Standard</a>
            </Button>
            <Button variant="outline" size="lg" asChild className="border-white/30 text-white hover:bg-white hover:text-brand-navy">
              <a href="#cazino">Pachete Cazino</a>
            </Button>
            <Button variant="outline" size="lg" asChild className="border-white/30 text-white hover:bg-white hover:text-brand-navy">
              <a href="#abonamente">Abonamente</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Standard */}
      <div className="section bg-white">
        <div className="container space-y-24">
          <PricingGroup
            packages={STANDARD_PACKAGES}
            id="standard"
            eyebrow="Pentru toate firmele"
            title="Pachete Standard"
            description="Trei opțiuni simple, în funcție de acoperirea dorită: județean, regional sau național."
          />

          <PricingGroup
            packages={CASINO_PACKAGES}
            id="cazino"
            eyebrow="iGaming • pariuri • cazino"
            title="Pachete Cazino"
            description="Pachete dedicate industriei iGaming, cu verificări de conformitate și publicare pe portaluri care acceptă conținut din această zonă."
          />

          <section id="abonamente" className="scroll-mt-24">
            <div className="max-w-3xl">
              <p className="eyebrow">Venit recurent — reducere permanentă</p>
              <h2 className="h2 mt-2">Abonamente lunare</h2>
              <p className="lead mt-4">
                Patru planuri lunare, fiecare cu preț dublu (standard / cazino). Cu cât publici
                mai des, cu atât prețul per articol scade.
              </p>
            </div>
            <div className="mt-10">
              <SubscriptionTable />
            </div>
          </section>

          <PricingNote />

          {/* Lead Magnet — Request List */}
          <section className="relative overflow-hidden rounded-2xl bg-brand-navy p-10 text-white lg:p-16">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-gold/20 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-brand-gold">
                  <Mail className="h-3.5 w-3.5" /> Gratuit • PDF pe email
                </div>
                <h3 className="mt-5 font-serif text-3xl font-bold sm:text-4xl">
                  Vrei lista completă a celor 50 de ziare?
                </h3>
                <p className="mt-4 text-white/85 leading-relaxed">
                  Completează formularul și îți trimitem în maximum 2 minute PDF-ul cu toate
                  ziarele partenere, regiunile acoperite și detaliile de publicare. Zero obligații,
                  zero spam.
                </p>
              </div>
              <div className="flex lg:justify-end">
                <RequestListModal
                  trigger={
                    <Button variant="gold" size="lg" className="whitespace-nowrap">
                      <Mail className="h-4 w-4" /> Trimite-mi PDF-ul
                    </Button>
                  }
                />
              </div>
            </div>
          </section>

          {/* CTA towards order */}
          <section className="rounded-2xl border-2 border-dashed border-brand-red/30 p-10 text-center">
            <h3 className="font-serif text-2xl font-semibold text-brand-navy">
              Ai nevoie de ceva custom?
            </h3>
            <p className="mt-3 text-slate-600 max-w-xl mx-auto">
              Agenții de PR, branduri cu volum mare sau campanii speciale — discutăm un tarif
              personalizat.
            </p>
            <Button variant="default" size="lg" asChild className="mt-6">
              <Link href="/contact">Contactează-ne pentru ofertă personalizată</Link>
            </Button>
          </section>
        </div>
      </div>

      <FAQ />
      <CtaBanner />
    </>
  );
}
