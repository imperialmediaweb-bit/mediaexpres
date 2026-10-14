import type { Metadata } from "next";
import { NEWSPAPERS } from "@/data/newspapers";
import { SITE } from "@/data/site";
import { ButonPlata } from "./ButonPlata";

/**
 * Pagina in engleza (12.10.2026), pentru agentiile si firmele din strainatate
 * care vor aparitii in presa din Romania (cazul clientei din Australia care a
 * intrebat de traducere, Meltwater si TVA). Pret in euro: 149, traducerea
 * inclusa, plata cu cardul (pachetul intl-50). Raspunsurile de mai jos sunt
 * exact cele date clientei pe WhatsApp.
 */

const TITLE = "Press Release Distribution in Romania: 50 News Sites";
const DESCRIPTION =
  "Publish your press release on 50 Romanian online news sites (41 local + 9 national) within 12 working hours. Translation from English included. €149, no VAT.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/en", languages: { "ro-RO": "/", en: "/en", "x-default": "/" } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE.url}/en`, locale: "en_US", type: "website" },
};

const FAQ = [
  {
    q: "How much does it cost to publish a press release in Romania?",
    a: "€149 for publication on all 50 Romanian news sites in our network (41 local news sites, one per county, and 9 national ones). English-to-Romanian translation is included. Our company is not VAT-registered, so €149 is the final amount.",
  },
  {
    q: "Do you translate the press release from English?",
    a: "Yes. Send it in English and we translate it into Romanian, keeping exactly the same meaning. The translation is included in the price.",
  },
  {
    q: "Will my press release be rewritten?",
    a: "Your choice. By default we publish your press release as provided, translated and identical on all 50 sites, which suits client reporting. On request, each site can get its own version of the text.",
  },
  {
    q: "How fast is it published?",
    a: "Within 12 working hours after payment and receiving the text. You get a report with all 50 live links.",
  },
  {
    q: "Do the links stay online?",
    a: "Yes, all articles and links stay online permanently, at the same address.",
  },
  {
    q: "Can Meltwater or other media monitoring tools track the articles?",
    a: "The monitoring tool decides which sources it tracks, so we can't guarantee it on their side. All 50 sites are public news sites indexed by Google, and each one has an RSS feed (for example https://botosaniexpres.ro/feed), which is what monitoring tools use. If a site is missing from your account, you can ask your provider to add it. You always get a full report with all live links.",
  },
  {
    q: "Is VAT added? We are a company outside Romania.",
    a: "No. Our company is not VAT-registered, so no Romanian VAT is added: €149 is the final amount. You receive an invoice in the name of your company.",
  },
  {
    q: "How do I pay?",
    a: "By card, through a secure Stripe payment page in English. After payment you send us the press release, images and links, plus your company details for the invoice.",
  },
];

const SCHEMA = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Press release distribution in Romania (50 news sites)",
    serviceType: "Press release distribution",
    description: DESCRIPTION,
    provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
    areaServed: { "@type": "Country", name: "Romania" },
    availableLanguage: ["en", "ro"],
    offers: { "@type": "Offer", price: "149", priceCurrency: "EUR", url: `${SITE.url}/en` },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

const REGIUNI: { titlu: string; regiune: string }[] = [
  { titlu: "National", regiune: "Național" },
  { titlu: "Moldova", regiune: "Moldova" },
  { titlu: "Transylvania", regiune: "Transilvania" },
  { titlu: "Muntenia & Dobrogea", regiune: "Muntenia" },
  { titlu: "Banat & Oltenia", regiune: "Banat" },
];

const INCLUS = [
  "Your press release on 50 Romanian online news sites: 41 local (one per county) + 9 national",
  "English-to-Romanian translation included",
  "Published within 12 working hours",
  "Report with all 50 live links, ready for client reporting",
  "Articles and links stay online permanently",
  "Distribution on the news sites' Facebook pages",
  "Invoice in your company's name, no VAT added",
];

export default function EnglishPage({ searchParams }: { searchParams: { cancelled?: string } }) {
  return (
    <div lang="en" className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />

      <section className="bg-brand-navy text-white">
        <div className="container py-16 md:py-24">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-gold">Press release distribution in Romania</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-bold leading-tight md:text-6xl">
            Your press release on 50 Romanian news sites
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/85">
            41 local news sites, one in every Romanian county, plus 9 national ones. Translated from English, published within
            12 working hours, with a report of all live links.
          </p>
          <div id="order" className="mt-8 flex scroll-mt-24 flex-wrap items-end gap-6">
            <div>
              <p className="text-5xl font-bold">€149</p>
              <p className="text-sm text-white/70">final price · translation included · no VAT</p>
              <p className="mt-1 text-xs text-white/60">Includes English-to-Romanian translation and support in English.</p>
            </div>
            <ButonPlata />
          </div>
          {searchParams.cancelled && (
            <p className="mt-4 text-sm text-white/80">
              The payment wasn&apos;t completed. Questions? Write to us on WhatsApp: {SITE.phone}.
            </p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container max-w-4xl">
          <h2 className="h2">What you get</h2>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {INCLUS.map((x) => (
              <li key={x} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-slate-700">
                <span className="font-bold text-brand-red">✓</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="container max-w-4xl">
          <h2 className="h2">How it works</h2>
          <ol className="mt-6 space-y-4 text-slate-700">
            <li><strong>1. Pay by card</strong> on a secure Stripe page in English (€149).</li>
            <li><strong>2. Send your press release</strong> in English, with images, links and your company details for the invoice.</li>
            <li><strong>3. We translate and publish</strong> it on all 50 sites within 12 working hours.</li>
            <li><strong>4. You get the report</strong> with all 50 live links.</li>
          </ol>
          <div className="mt-8">
            <ButonPlata label="Publish my press release — €149" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-5xl">
          <h2 className="h2">The 50 news sites</h2>
          <p className="mt-3 text-slate-600">Open any of them to see what they published today.</p>
          <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {REGIUNI.map((r) => (
              <div key={r.regiune}>
                <h3 className="font-serif text-lg font-bold text-brand-navy">{r.titlu}</h3>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {NEWSPAPERS.filter((n) => n.region === r.regiune).map((n) => (
                    <li key={n.url}>
                      <a href={n.url} target="_blank" rel="nofollow noopener" className="text-slate-700 underline decoration-slate-300 hover:text-brand-red">
                        {n.name}
                      </a>
                      {n.county ? <span className="text-slate-400"> · {n.county}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="container max-w-3xl">
          <h2 className="h2">Frequently asked questions</h2>
          <div className="mt-6 space-y-4">
            {FAQ.map((f) => (
              <details key={f.q} className="rounded-xl border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer font-semibold text-brand-navy">{f.q}</summary>
                <p className="mt-3 text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-slate-600">
            Questions before ordering? Email <a className="underline" href={`mailto:${SITE.email}`}>{SITE.email}</a> or WhatsApp {SITE.phone}.
          </p>
        </div>
      </section>

      <footer className="bg-brand-navy py-10 text-sm text-white/70">
        <div className="container">
          <p className="font-semibold text-white">MediaExpres</p>
          <p className="mt-2">Legio Web Development Tools S.R.L. · Botoșani, Romania · {SITE.email} · WhatsApp {SITE.phone}</p>
          <p className="mt-2">© {new Date().getFullYear()} MediaExpres</p>
        </div>
      </footer>
    </div>
  );
}
