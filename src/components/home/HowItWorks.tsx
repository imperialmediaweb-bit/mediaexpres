import { PackageOpen, FileText, Send, FileCheck2 } from "lucide-react";

const STEPS = [
  {
    icon: PackageOpen,
    title: "Alegi pachetul",
    description:
      "Local, Regional, Național sau abonament lunar. Selectezi în funcție de obiectivul tău.",
  },
  {
    icon: FileText,
    title: "Trimiți articolul",
    description:
      "Titlu, text, (opțional) imagini. Acceptăm text gata scris sau idei pe care le redactăm.",
  },
  {
    icon: Send,
    title: "Publicăm pe 50 ziare",
    description:
      "În maximum 24h publicăm pe rețeaua noastră + distribuim automat pe 50 pagini Facebook.",
  },
  {
    icon: FileCheck2,
    title: "Primești raport PDF",
    description:
      "Raport complet cu URL-urile și screenshot-urile tuturor publicărilor. Permanent online.",
  },
];

export function HowItWorks() {
  return (
    <section className="section bg-white">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Simplu ca 1-2-3-4</p>
          <h2 className="h2 mt-2">Cum funcționează</h2>
          <p className="lead mt-4">
            Proces simplu, rezultate mari. În mai puțin de 24h ești pe prima pagină a celor mai
            citite ziare românești.
          </p>
        </div>

        <div className="relative mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div
            aria-hidden="true"
            className="absolute left-8 right-8 top-10 hidden h-px bg-gradient-to-r from-brand-gold via-brand-red to-brand-gold lg:block"
          />
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative flex flex-col items-center text-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white ring-4 ring-brand-red/20 shadow-lg">
                <step.icon className="h-8 w-8 text-brand-red" />
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-6 font-serif text-xl font-semibold text-brand-navy">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
