import type { Metadata } from "next";
import Link from "next/link";
import { ButonComanda } from "@/components/comanda/comanda-promo";
import { SITE } from "@/data/site";

/**
 * Pagina pentru cumparatorii de advertoriale SEO (14.10.2026).
 *
 * OpenSEO, Romania: „advertoriale seo" ~480 cautari/luna si „articole seo"
 * ~320, ambele cu intentie de cumparare si concurenta mica. Reclama Google pe
 * aceste cuvinte ducea pe /oferta-500, scrisa pentru „aparitii in presa";
 * cine cauta SEO vrea sa citeasca despre linkuri.
 *
 * REGULA (decizia proprietarului): pagina e indexata, deci NU are linkuri spre
 * cele 50 de site-uri si nu le prezinta ca retea a aceleiasi firme. Lista
 * completa sta pe /oferta-500, care e noindex.
 */

const TITLE = "Advertoriale SEO pe 50 de site-uri de știri .ro";
const DESCRIPTION =
  "Advertoriale SEO pe 50 de site-uri de știri .ro: articol unic pe fiecare, linkuri permanente în text, ancore variate, publicare întinsă pe 2 săptămâni. 500 lei.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/advertoriale-seo" },
};

const FAQ = [
  {
    q: "Ce primesc pentru 500 de lei?",
    a: "Un articol publicat pe 50 de site-uri de știri .ro (41 locale, câte unul pe județ, și 9 naționale), cu text unic pe fiecare site și linkuri permanente către site-ul tău, în corpul articolului. Primești raportul cu toate cele 50 de linkuri și factură.",
  },
  {
    q: "Linkurile sunt dofollow?",
    a: "Sunt linkuri obișnuite, fără atribute care le anulează, și rămân permanent la aceeași adresă.",
  },
  {
    q: "Pot alege textul linkurilor (ancorele)?",
    a: "Da. Ne dai brandul, adresa site-ului și câteva ancore descriptive, iar textul linkului variază de la un site la altul, ca să nu apară aceeași ancoră de 50 de ori.",
  },
  {
    q: "În cât timp apar articolele?",
    a: "Le putem publica toate în 12 ore lucrătoare sau întinse pe 2 săptămâni, ca să arate ca un flux normal de apariții. Pentru SEO recomandăm 2 săptămâni. Prețul e același.",
  },
  {
    q: "E același articol copiat pe toate site-urile?",
    a: "Nu. Fiecare site primește articolul rescris complet: alt titlu, alte propoziții, altă ordine a ideilor. Rămân la fel doar faptele, numele și linkurile tale.",
  },
  {
    q: "Garantați poziții în Google?",
    a: "Nu, și nimeni cinstit nu poate. Un link contează doar dacă pagina de pe care vine e indexată, iar asta o decide Google. Garantăm publicarea reală, permanentă, verificabilă link cu link în raport.",
  },
  {
    q: "Nu am articolul scris. Îl scrieți voi?",
    a: "Da, inclus în preț. Ne dai site-ul și tema, scriem articolul optimizat pe cuvintele tale cheie, iar tu îl verifici înainte de publicare.",
  },
];

const SCHEMA = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: TITLE,
    serviceType: "Advertoriale SEO",
    description: DESCRIPTION,
    provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
    areaServed: { "@type": "Country", name: "România" },
    offers: { "@type": "Offer", price: "500", priceCurrency: "RON", url: `${SITE.url}/advertoriale-seo` },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

const PUNCTE = [
  { t: "50 de domenii .ro de știri", d: "41 de site-uri locale, câte unul în fiecare județ, plus 9 naționale. Toate publică zilnic știri." },
  { t: "Linkuri permanente în text", d: "Linkurile stau în corpul articolului, nu în subsol, și rămân online la aceeași adresă." },
  { t: "Ancore variate", d: "Brand, adresă simplă și ancore descriptive alese de tine, diferite de la un site la altul." },
  { t: "Text unic pe fiecare site", d: "Articolul e rescris complet pentru fiecare publicație, fără conținut duplicat." },
  { t: "Ritm natural", d: "Publicare întinsă pe 2 săptămâni, nu 50 de linkuri în aceeași zi." },
  { t: "Raport și factură", d: "Toate cele 50 de linkuri într-un raport, plus factură fiscală. Plată cu cardul sau prin OP." },
];

const BTN =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-8 py-4 text-lg font-bold text-white shadow-xl shadow-brand-red/20 transition hover:bg-brand-red/90 disabled:opacity-60 sm:w-auto";

export default function AdvertorialeSeoPage() {
  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />

      <section className="bg-brand-navy text-white">
        <div className="container py-16 md:py-24">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-gold">Advertoriale SEO</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-bold leading-tight md:text-6xl">
            50 de linkuri de pe site-uri de știri .ro, într-o singură comandă
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/85">
            Articolul tău, rescris unic pentru fiecare site, cu linkuri permanente în text și ancore variate. Publicat
            întins pe 2 săptămâni sau în 12 ore lucrătoare, cum alegi.
          </p>
          <div className="mt-8 flex flex-wrap items-end gap-6">
            <div>
              <p className="text-5xl font-bold">500 lei</p>
              <p className="text-sm text-white/70">10 lei pe link · preț final, cu factură</p>
            </div>
            <ButonComanda className={BTN} />
          </div>
          <p className="mt-4 text-sm text-white/70">
            Firmă care plătește prin OP?{" "}
            <Link href="/comanda/transfer?pachet=promo-50" className="underline">
              Comandă cu ordin de plată
            </Link>{" "}
            · Întrebări: WhatsApp {SITE.phone}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-5xl">
          <h2 className="h2">Ce primești</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PUNCTE.map((p) => (
              <div key={p.t} className="rounded-xl border border-slate-200 p-6">
                <h3 className="font-serif text-lg font-bold text-brand-navy">{p.t}</h3>
                <p className="mt-2 text-sm text-slate-600">{p.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-600">
            Vrei să vezi site-urile înainte să comanzi?{" "}
            <Link href="/oferta-500#lista-ziare" className="font-semibold text-brand-red underline">
              Vezi lista completă
            </Link>
          </p>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="container max-w-3xl">
          <h2 className="h2">Cum merge</h2>
          <ol className="mt-6 space-y-4 text-slate-700">
            <li><strong>1. Comanzi</strong> cu cardul sau prin OP (500 lei, factură).</li>
            <li><strong>2. Ne trimiți</strong> articolul, linkurile și ancorele dorite, sau doar site-ul și tema, iar articolul îl scriem noi.</li>
            <li><strong>3. Alegi ritmul:</strong> 12 ore lucrătoare sau întins pe 2 săptămâni.</li>
            <li><strong>4. Primești raportul</strong> cu toate cele 50 de linkuri.</li>
          </ol>
          <div className="mt-8">
            <ButonComanda className={BTN} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-3xl">
          <h2 className="h2">Întrebări frecvente</h2>
          <div className="mt-6 space-y-4">
            {FAQ.map((f) => (
              <details key={f.q} className="rounded-xl border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer font-semibold text-brand-navy">{f.q}</summary>
                <p className="mt-3 text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
