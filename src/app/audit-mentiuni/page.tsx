import type { Metadata } from "next";
import { Search, Shield, Zap, Eye } from "lucide-react";
import { AuditClient } from "./AuditClient";

const TITLE = "Audit gratuit menționări în presă — MediaExpres";
const DESCRIPTION =
  "Verifică în 5 secunde câte menționări are firma ta în presa românească. Caut în Google News ultimele 6 luni — gratuit, fără cont.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/audit-mentiuni" },
  keywords: [
    "audit menționări presă",
    "vizibilitate firmă presă",
    "menționări Google News firmă",
    "monitorizare presă gratis",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/audit-mentiuni",
  },
};

const FEATURES = [
  {
    icon: Search,
    title: "Caut în Google News",
    text: "Toată baza Google News pe limba română, ultimele 6 luni de articole.",
  },
  {
    icon: Zap,
    title: "Răspuns în 5 secunde",
    text: "Pun numele firmei, primești instant numărul de mențiuni + ultimele 5 articole.",
  },
  {
    icon: Eye,
    title: "Compară-te cu media",
    text: "Aflu dacă firma ta apare în presă cât trebuie, sau dacă ești invizibil online.",
  },
  {
    icon: Shield,
    title: "100% gratuit + privat",
    text: "Nu salvăm numele firmei tale. Verificarea e anonimă.",
  },
];

export default function AuditPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Audit menționări presă MediaExpres",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RON",
    },
    description: DESCRIPTION,
    url: "https://mediaexpress.ro/audit-mentiuni",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="bg-gradient-to-b from-brand-ivory to-white">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-red">
              <Search className="h-3.5 w-3.5" /> Gratuit • Google News • fără cont
            </div>
            <h1 className="h1 mt-4">
              Câte mențiuni în presă are firma ta?
            </h1>
            <p className="lead mt-4 text-slate-600">
              Pun numele firmei tale, eu caut în Google News pentru România și
              îți spun în 5 secunde câte articole te menționează în ultimele 6
              luni — plus ultimele 5 link-uri găsite. Verifică-te gratuit, apoi
              decide dacă ai nevoie de mai multă vizibilitate.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <f.icon className="h-6 w-6 text-brand-red" />
                <h3 className="mt-3 font-serif font-bold text-brand-navy">
                  {f.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-12">
        <div className="mx-auto max-w-3xl">
          <AuditClient />
        </div>
      </section>
    </>
  );
}
