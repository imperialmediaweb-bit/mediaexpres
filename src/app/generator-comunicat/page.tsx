import type { Metadata } from "next";
import { CheckCircle2, Sparkles, Clock, Shield, Zap } from "lucide-react";
import { PublicGenerateForm } from "./PublicGenerateForm";

const TITLE = "Generator gratuit comunicat de presă cu AI — MediaExpres";
const DESCRIPTION =
  "Scrie un comunicat de presă profesional în 30 de secunde, gratuit și fără cont. AI antrenat pe stilul jurnalistic românesc. Apoi îl poți publica pe 50 de ziare cu un singur click.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/generator-comunicat" },
  keywords: [
    "generator comunicat de presă",
    "comunicat de presă gratuit",
    "comunicat presă AI",
    "model comunicat de presă",
    "press release Romania",
    "redactare comunicat presă",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/generator-comunicat",
    type: "website",
  },
};

const FAQ = [
  {
    q: "Cât costă să folosesc generatorul?",
    a: "Este 100% gratuit. Nu trebuie să-ți faci cont și nu primești costuri ascunse. Singura limitare: 5 generări pe oră, per IP, ca să prevenim abuzul.",
  },
  {
    q: "Pot folosi textul generat oriunde?",
    a: "Da. Comunicatul îți aparține integral. Îl poți copia, edita, publica pe site-ul tău, trimite la jurnaliști sau pe orice altă platformă, fără atribuire.",
  },
  {
    q: "Cum publici comunicatul după ce îl ai?",
    a: "Cea mai simplă variantă: pachetul Național MediaExpres îl publică pe 41 ziare locale + 9 naționale + 50 pagini Facebook în 24h. Costă 1500 RON, plătit o singură dată, rămâne online permanent.",
  },
  {
    q: "AI-ul scrie text duplicat? E penalizat de Google?",
    a: "Nu. Fiecare generare e unică (fiind bazată pe input-ul specific al firmei tale). Modelul AI nu reproduce texte existente, ci scrie de la zero un text original pentru tine.",
  },
  {
    q: "Pot edita textul înainte de publicare?",
    a: "Absolut. Recomandăm chiar să-l citești și ajustezi — adaugă cifre, citate, detalii specifice. AI-ul îți dă 80% din muncă, ultima 20% rămâne la tine.",
  },
];

const BENEFITS = [
  {
    icon: Zap,
    title: "30 de secunde",
    text: "AI scrie comunicatul în mai puțin timp decât îți ia să citești un email.",
  },
  {
    icon: Sparkles,
    title: "Format profesional",
    text: "Structură jurnalistică standard: titlu + intro + dezvoltare + citat + boilerplate.",
  },
  {
    icon: Shield,
    title: "Gratuit și fără cont",
    text: "Fără înregistrare, fără card, fără email. Pur și simplu generezi și folosești.",
  },
  {
    icon: Clock,
    title: "În limba română",
    text: "Diacritice corecte, ton neutru-redacțional, adaptat pieței din România.",
  },
];

export default function GeneratorComunicatPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Generator comunicat de presă MediaExpres",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RON",
    },
    description: DESCRIPTION,
    url: "https://mediaexpress.ro/generator-comunicat",
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <section className="bg-gradient-to-b from-brand-ivory to-white">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-red">
              <Sparkles className="h-3.5 w-3.5" /> Gratuit • AI • fără cont
            </div>
            <h1 className="h1 mt-4">
              Generator gratuit de comunicat de presă cu AI
            </h1>
            <p className="lead mt-4 text-slate-600">
              Spune-ne în 2 propoziții ce vrei să anunți și AI-ul îți scrie
              comunicatul complet — titlu, paragrafe, citat, boilerplate — în
              format jurnalistic profesional. Limba română, diacritice corecte,
              gata de publicat.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <b.icon className="h-6 w-6 text-brand-red" />
                <h3 className="mt-3 font-serif font-bold text-brand-navy">
                  {b.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 md:p-10 shadow-sm">
          <PublicGenerateForm />
        </div>
      </section>

      <section className="bg-brand-ivory">
        <div className="container py-16">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow text-brand-red">Întrebări frecvente</p>
            <h2 className="h2 mt-2">Tot ce vrei să știi despre generator</h2>
            <div className="mt-8 space-y-4">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-slate-200 bg-white p-5 open:shadow-md"
                >
                  <summary className="cursor-pointer font-serif font-bold text-brand-navy list-none flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-brand-red transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand-navy text-white">
        <div className="container py-16 text-center">
          <p className="eyebrow text-brand-gold">După ce ai comunicatul</p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold mt-3">
            Publică-l pe 50 de ziare în 24h
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-white/80">
            Comunicatul tău AI ajunge instantaneu pe 41 ziare locale + 9
            naționale + 50 pagini Facebook. Linkurile rămân online permanent,
            primești raport PDF complet cu toate URL-urile.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-3 max-w-3xl mx-auto text-sm">
            {[
              "Articol pe 50 ziare cu autoritate SEO reală",
              "Distribuție Facebook automată inclusă",
              "Linkuri permanente + raport PDF",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-left text-white/90"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-gold mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/pachete"
              className="inline-flex h-12 items-center rounded-md bg-brand-gold px-6 text-sm font-bold text-brand-navy hover:bg-brand-gold-light transition"
            >
              Vezi pachetele — de la 150 RON
            </a>
            <a
              href="/oferta"
              className="inline-flex h-12 items-center rounded-md border border-white/40 px-6 text-sm font-bold text-white hover:bg-white hover:text-brand-navy transition"
            >
              Solicită lista ziarelor (gratuit)
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
