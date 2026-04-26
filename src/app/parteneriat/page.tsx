import type { Metadata } from "next";
import { CheckCircle2, Users, Banknote, Zap } from "lucide-react";
import { PartnerApplyForm } from "./PartnerApplyForm";

export const metadata: Metadata = {
  title: "Parteneriat ziare — MediaExpres",
  description:
    "Ești owner de site de știri? Aplică să intri în rețeaua MediaExpres și primește articole remunerate constant.",
  alternates: { canonical: "/parteneriat" },
};

const BENEFITS = [
  {
    icon: Banknote,
    title: "Venit suplimentar stabil",
    text:
      "Îți plătim pentru fiecare articol publicat. Termenele și tarifele se stabilesc la semnarea parteneriatului.",
  },
  {
    icon: Zap,
    title: "Proces simplu",
    text:
      "Primești articolul gata de publicare (text + poze). Tu îl urci cât de repede poți, trimiți URL-ul, gata.",
  },
  {
    icon: Users,
    title: "Rețea serioasă",
    text:
      "Facem parte din cea mai mare rețea editorială din România — clienții sunt firme reale, nu spam.",
  },
  {
    icon: CheckCircle2,
    title: "Conținut de calitate",
    text:
      "Verificăm fiecare articol înainte să-l trimitem. Nimic ilegal, clickbait sau care să strice brand-ul tău.",
  },
];

export default function ParteneriatPage() {
  return (
    <section className="bg-white">
      <div className="container grid gap-12 py-16 lg:grid-cols-[1fr_1.2fr] lg:py-20">
        <div className="order-2 lg:order-1">
          <p className="eyebrow">Parteneriat ziare</p>
          <h1 className="h1 mt-2">
            Adaugă site-ul tău în rețeaua MediaExpres
          </h1>
          <p className="lead mt-4">
            Dacă ai un ziar online, site de știri sau blog local cu trafic real
            și conținut editorial serios, poți aplica să intri în rețeaua
            noastră de distribuție și să primești articole remunerate lunar.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl bg-brand-ivory p-5">
                <b.icon className="h-6 w-6 text-brand-red" />
                <h3 className="mt-3 font-serif font-bold text-brand-navy">
                  {b.title}
                </h3>
                <p className="mt-1 text-sm text-slate-700">{b.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-brand-navy/10 bg-white p-5">
            <p className="eyebrow mb-3">Ce căutăm</p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>✓ Site de știri activ (postări regulate, conținut editorial)</li>
              <li>✓ Trafic minim 5.000 vizite/lună (ideal 20k+)</li>
              <li>✓ Domeniu propriu, nu subdomeniu gratuit</li>
              <li>✓ Posibilitate de publicare în maximum 24h de la primire</li>
              <li>✓ Pagină de contact cu date firmă vizibile</li>
            </ul>
          </div>
        </div>

        <aside className="order-1 lg:order-2">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <PartnerApplyForm />
          </div>
        </aside>
      </div>
    </section>
  );
}
