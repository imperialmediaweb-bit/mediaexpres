import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, FileText, PenLine, Newspaper, FolderCheck, Clock, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/data/site";
import { COUNTIES } from "@/data/counties";

/**
 * 18.11.2026 — o singura pagina pentru comunicatele de proiect cu fonduri
 * europene (inceput / finalizare). Pe Google sunt ~40 de cautari pe luna in
 * toata tara, deci NU facem pagini pe orase; clientii vin mai ales prin
 * contact direct si consultanti. Pretul: 350 lei publicarea comunicatului
 * primit, 450 lei daca il scriem noi, +100 lei urgent in 24 h.
 */

const URL_PAGINA = "/comunicat-proiect-european";
const TITLU = "Publicare comunicat de presă proiect european (început și finalizare)";
const DESCRIERE =
  "Publicăm comunicatul de început sau de finalizare al proiectului PNRR, Regio sau POCIDIF în ziarul local din județul tău și în presa națională, cu dosar de dovadă pentru raportare. 350 lei. Dacă nu-l ai, îl scriem noi.";

export const metadata: Metadata = {
  title: "Comunicat de presă proiect european: publicare cu dovadă pentru dosar | MediaExpres",
  description: DESCRIERE,
  alternates: { canonical: URL_PAGINA },
  keywords: [
    "comunicat de presa inceput proiect",
    "comunicat de presa finalizare proiect",
    "comunicat de presa pnrr",
    "anunt finalizare proiect",
    "publicare comunicat proiect fonduri europene",
    "model comunicat de presa inceput proiect",
  ],
  openGraph: { title: TITLU, description: DESCRIERE, url: URL_PAGINA },
};

const wa = (text: string) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
const WA_AM = wa("Bună ziua! Am comunicatul de presă pentru proiectul european și vreau să-l publicați (350 lei). Vi-l trimit aici.");
const WA_SCRIETI = wa("Bună ziua! Am nevoie de comunicatul de presă pentru proiectul european, scris de voi și publicat (450 lei).");
const MAIL = `mailto:${SITE.email}?subject=${encodeURIComponent("Comunicat proiect european")}`;

const CONTINUT = [
  "Numele beneficiarului (firma, primăria sau ONG-ul)",
  "Titlul proiectului și codul SMIS / codul de identificare",
  "Programul de finanțare (PNRR, Regio, POCIDIF, PEO etc.) și axa / apelul",
  "Valoarea totală a proiectului și valoarea finanțării nerambursabile",
  "Data de început și durata (sau data finalizării)",
  "Obiectivul general și rezultatele așteptate (sau obținute)",
  "Locul de implementare și persoana de contact",
  "Banda cu siglele și mențiunea obligatorie despre finanțare, conform manualului de identitate vizuală al programului",
];

const FAQ = [
  {
    q: "Este obligatoriu comunicatul de presă la începutul și la finalul proiectului?",
    a: "Pentru majoritatea proiectelor cu finanțare europeană, da: contractul de finanțare și manualul de identitate vizuală al programului cer un comunicat la început și unul la finalizare. Verifică în contractul tău sau întreabă consultantul. Noi îl publicăm și îți dăm dovada pentru dosar.",
  },
  {
    q: "Am deja comunicatul de la consultant, cu sigle. Îl publicați exact așa?",
    a: "Da. Ni-l trimiți în Word, PDF sau ca imagine și îl publicăm identic: textul ca articol și banda cu siglele ca imagine, la începutul articolului. Nu modificăm nimic din conținut.",
  },
  {
    q: "Nu am comunicatul și nu știu cum se face. Mă ajutați?",
    a: "Da. Ne dai titlul proiectului, codul SMIS, valoarea și programul, iar noi scriem comunicatul după regulile programului, cu banda de sigle. Ți-l trimitem înainte de publicare, să-l aprobi. Costă 450 lei cu tot cu publicarea.",
  },
  {
    q: "Ce primesc ca dovadă pentru dosarul de raportare?",
    a: "Un dosar PDF cu capturile articolelor publicate (cu siglele vizibile), linkurile, data publicării și numele fiecărei publicații. Îl atașezi direct la raportarea către autoritatea de management.",
  },
  {
    q: "În ce ziare apare comunicatul?",
    a: "În ziarul local din județul în care se implementează proiectul (avem câte un ziar în fiecare județ) și în 2–3 ziare naționale din rețeaua noastră. Articolele rămân online permanent.",
  },
  {
    q: "Pot plăti din bugetul proiectului? Primesc factură?",
    a: "Primești factură fiscală pe firma beneficiarului, cu mențiunea serviciului. Cheltuielile de informare și publicitate sunt de obicei eligibile; verifică bugetul proiectului tău.",
  },
  {
    q: "Cât de repede se publică?",
    a: "În maximum 12 ore lucrătoare de la primirea comunicatului și a plății (de la aprobare, dacă îl scriem noi). Dacă ai termen strâns, varianta urgentă are prioritate în aceeași zi (+100 lei).",
  },
];

export default function ComunicatProiectEuropeanPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: TITLU,
    description: DESCRIERE,
    provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
    areaServed: { "@type": "Country", name: "România" },
    serviceType: "Publicare comunicate de presă pentru proiecte cu finanțare europeană",
    offers: [
      { "@type": "Offer", name: "Publicare comunicat primit", price: "350", priceCurrency: "RON" },
      { "@type": "Offer", name: "Redactare și publicare comunicat", price: "450", priceCurrency: "RON" },
    ],
  };

  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />

      {/* Hero */}
      <section className="bg-brand-navy text-white">
        <div className="container py-16 md:py-20">
          <div className="mx-auto max-w-3xl">
            <nav className="text-sm text-white/60">
              <Link href="/" className="hover:text-white">Acasă</Link>
              <span className="mx-2">/</span>
              <span className="text-white/80">Comunicat proiect european</span>
            </nav>
            <h1 className="mt-4 font-serif text-3xl font-bold leading-tight md:text-5xl">
              Comunicatul de presă al proiectului tău european, publicat și gata pentru dosar
            </h1>
            <p className="mt-5 text-lg text-white/85">
              Comunicat de început sau de finalizare pentru proiecte PNRR, Regio, POCIDIF și alte programe. Îl publicăm în
              ziarul local din județul tău și în presa națională, iar tu primești dosarul de dovadă pentru raportare.
            </p>
            <ul className="mt-6 space-y-2 text-white/85">
              {[
                "Publicăm comunicatul exact cum l-ai primit, cu sigle",
                "Nu-l ai? Îl scriem noi, după regulile programului",
                "Dosar PDF de dovadă: capturi, linkuri, date",
                "Factură fiscală pe firma beneficiarului",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-gold" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="accent" size="lg" asChild>
                <a href="#preturi">Vezi prețurile — de la 350 lei</a>
              </Button>
              <Button variant="outline" size="lg" className="border-white/30 bg-transparent text-white hover:bg-white/10" asChild>
                <a href={WA_AM} target="_blank" rel="noopener">
                  <MessageCircle className="mr-2 h-5 w-5" /> Trimite comunicatul pe WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Preturi: doua variante */}
      <section id="preturi" className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Alege varianta</p>
            <h2 className="h2 mt-2">Ai deja comunicatul sau îl scriem noi?</h2>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
            <div className="flex flex-col rounded-2xl border-2 border-brand-navy bg-white p-7">
              <FileText className="h-8 w-8 text-brand-navy" />
              <h3 className="mt-4 font-serif text-2xl font-bold text-brand-navy">Am comunicatul</h3>
              <p className="mt-1 text-slate-600">Îl publicăm exact cum e, cu banda de sigle.</p>
              <p className="mt-5 text-4xl font-bold text-brand-navy">
                350 <span className="text-lg font-semibold text-slate-500">lei / comunicat</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
                {[
                  "Trimiți Word, PDF sau imagine, cu sigle",
                  "Ziarul local din județul proiectului + 2–3 ziare naționale",
                  "Dosar PDF de dovadă pentru raportare",
                  "Online permanent, factură fiscală",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {t}
                  </li>
                ))}
              </ul>
              <Button variant="accent" size="lg" className="mt-6 w-full" asChild>
                <a href={WA_AM} target="_blank" rel="noopener">Trimit comunicatul</a>
              </Button>
            </div>
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7">
              <PenLine className="h-8 w-8 text-brand-red" />
              <h3 className="mt-4 font-serif text-2xl font-bold text-brand-navy">Scrieți-l voi</h3>
              <p className="mt-1 text-slate-600">Nu știi cum se face? Îl redactăm noi, după reguli.</p>
              <p className="mt-5 text-4xl font-bold text-brand-navy">
                450 <span className="text-lg font-semibold text-slate-500">lei / comunicat</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
                {[
                  "Ne dai titlul, codul SMIS, valoarea, programul",
                  "Scriem comunicatul și punem banda de sigle",
                  "Ți-l arătăm înainte, îl aprobi",
                  "Publicare + dosar de dovadă, ca la prima variantă",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {t}
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="lg" className="mt-6 w-full" asChild>
                <a href={WA_SCRIETI} target="_blank" rel="noopener">Vreau să-l scrieți voi</a>
              </Button>
            </div>
          </div>
          <div className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-slate-600">
            <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Urgent, în aceeași zi: +100 lei</span>
            <span className="flex items-center gap-2"><Newspaper className="h-4 w-4" /> Început + finalizare: 600 lei pachetul</span>
            <a href={MAIL} className="flex items-center gap-2 hover:text-brand-navy hover:underline">
              <Mail className="h-4 w-4" /> sau pe email: {SITE.email}
            </a>
          </div>
        </div>
      </section>

      {/* Dosarul de dovada */}
      <section className="section">
        <div className="container">
          <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-2">
            <div>
              <FolderCheck className="h-9 w-9 text-brand-red" />
              <h2 className="h2 mt-3">Dovada pentru dosar, gata făcută</h2>
              <p className="mt-4 text-slate-600">
                La raportare, autoritatea de management cere dovada că ai făcut publicitatea proiectului. Îți trimitem un
                dosar PDF pe care îl atașezi direct:
              </p>
              <ul className="mt-5 space-y-2 text-slate-700">
                {[
                  "Captura fiecărui articol, cu siglele vizibile",
                  "Linkul permanent al fiecărei publicații",
                  "Data publicării și numele ziarului",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <ol className="space-y-4">
              {[
                ["Trimiți comunicatul", "Sau datele proiectului, dacă îl scriem noi."],
                ["Primești factura", "Pe firma beneficiarului. Plătești prin ordin de plată sau card."],
                ["Publicăm", "În maximum 12 ore lucrătoare."],
                ["Primești dosarul", "PDF cu capturi, linkuri și date, pe email."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4 rounded-xl border border-slate-200 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-brand-navy">{t}</p>
                    <p className="text-sm text-slate-600">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Ce trebuie sa contina */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="h2">Ce trebuie să conțină comunicatul de început sau de finalizare a proiectului</h2>
            <p className="mt-4 text-slate-600">
              Regulile exacte sunt în manualul de identitate vizuală al programului tău. În general, comunicatul are:
            </p>
            <ul className="mt-6 grid gap-3 md:grid-cols-2">
              {CONTINUT.map((t) => (
                <li key={t} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Model de început (prescurtat)</p>
              <p className="mt-3 text-slate-700">
                <strong>[Denumirea beneficiarului]</strong> anunță începerea proiectului <strong>„[Titlul proiectului]”</strong>,
                cod SMIS <strong>[cod]</strong>, finanțat prin <strong>[programul]</strong>. Valoarea totală a proiectului este
                de <strong>[…] lei</strong>, din care finanțare nerambursabilă <strong>[…] lei</strong>. Proiectul se
                desfășoară în perioada <strong>[…]</strong>, în <strong>[localitatea]</strong>, și are ca obiectiv{" "}
                <strong>[…]</strong>. Date de contact: <strong>[persoană, telefon, email]</strong>.
              </p>
              <p className="mt-3 text-sm text-slate-500">
                Comunicatul de finalizare are aceeași structură, cu rezultatele obținute în loc de cele așteptate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Judete */}
      <section className="section">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="h2">Publicăm în ziarul local din județul proiectului</h2>
            <p className="mt-4 text-slate-600">
              Avem câte un ziar local în fiecare județ, plus ziare naționale. Comunicatul apare acolo unde se implementează
              proiectul: {COUNTIES.map((c) => c.name).join(", ")}.
            </p>
            <p className="mt-4 text-sm text-slate-600">
              Vezi <Link href="/reteaua-noastra" className="font-semibold text-brand-red hover:underline">toate ziarele rețelei</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="h2 text-center">Întrebări frecvente</h2>
            <div className="mt-10 space-y-4">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-xl border border-slate-200 bg-white p-5">
                  <summary className="cursor-pointer font-semibold text-brand-navy">{f.q}</summary>
                  <p className="mt-3 text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button variant="accent" size="lg" asChild>
                <a href={WA_AM} target="_blank" rel="noopener">
                  <MessageCircle className="mr-2 h-5 w-5" /> Trimite comunicatul pe WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
