import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// 11.10.2026 (optimizare pentru cautarea cu AI: ChatGPT, Gemini, Perplexity,
// Copilot): primele intrebari sunt exact ce intreaba oamenii — „ce este un
// advertorial", „cat costa", „unde public un comunicat". Raspunsurile incep cu
// definitia sau cifra, intr-o fraza care se poate cita singura. Acelasi text
// pleaca si ca FAQPage (JSON-LD) mai jos. FAQ-ul de pe /oferta-500 nu ajuta
// aici: pagina e noindex.
export const FAQS = [
  {
    q: "Ce este un advertorial?",
    a: "Un advertorial este un articol plătit, scris în stil jurnalistic, publicat într-un ziar sau pe un site de știri ca să prezinte o firmă, un produs sau un serviciu. Spre deosebire de un banner, se citește ca un articol și rămâne online permanent. La MediaExpres, un advertorial se publică în 50 de ziare online din România pentru 500 de lei.",
  },
  {
    q: "Cât costă un advertorial sau un comunicat de presă?",
    a: "La MediaExpres, un articol într-un ziar local costă 150 de lei, în 10 ziare dintr-o regiune 500 de lei, iar în toate cele 50 de ziare online oferta curentă este tot 500 de lei (preț de listă 1.500 de lei). Pentru cazino și pariuri, publicarea în 50 de ziare costă 1.000 de lei. Prețurile sunt finale, cu factură; firma nu este plătitoare de TVA.",
  },
  {
    q: "Unde public un comunicat de presă în România?",
    a: "Pe site-uri de știri locale și naționale. MediaExpres publică un comunicat de presă în 50 de ziare online din România dintr-o singură comandă: 41 de ziare locale (câte unul în fiecare județ) și 9 publicații naționale, cu raport cu toate linkurile și distribuire pe 46 de pagini de Facebook.",
  },
  {
    q: "Care e diferența dintre advertorial și comunicat de presă?",
    a: "Comunicatul de presă anunță o știre (o lansare, un eveniment, un rezultat) pe un ton neutru, informativ. Advertorialul prezintă firma sau produsul cu scop de promovare, ca un articol. În rețeaua MediaExpres ambele se publică la fel, la același preț.",
  },
  {
    q: "Cum fac publicitate în ziarele locale?",
    a: "Alegi ziarul din județul tău (sau mai multe), trimiți articolul gata scris sau doar tema și site-ul, plătești cu cardul sau prin ordin de plată, iar articolul apare în maximum 12 ore lucrătoare, cu distribuire pe pagina de Facebook a ziarului. Lista celor 50 de ziare e publică pe mediaexpress.ro/reteaua-noastra.",
  },
  {
    q: "În cât timp îmi este publicat articolul?",
    a: "În maximum 12 ore lucrătoare de la confirmarea plății și primirea textului. De obicei, publicarea se face în același zi, iar linkurile sunt livrate pe email cu raport parțial, urmat de raportul PDF complet.",
  },
  {
    q: "Pot trimite articol gata scris sau îl redactați voi?",
    a: "Ambele variante. Poți trimite textul gata scris (îl publicăm ca atare), sau poți să ne dai doar punctele-cheie și scriem noi un articol profesionist, optimizat SEO, pentru presă.",
  },
  {
    q: "Pot alege pe ce ziare apar?",
    a: "Pentru pachetul Local, da — alegi ziarul dorit dintr-o listă. Pentru Regional alegi zona (Moldova / Transilvania / Muntenia / Banat). Pentru Național 50, articolul apare pe toate cele 50 de ziare din rețeaua noastră.",
  },
  {
    q: "Cât timp rămâne articolul online?",
    a: "Permanent. Ziarele sunt ale noastre, nu ale unor terți — articolul rămâne online cât timp există rețeaua, fără să depindem de bunăvoința altcuiva.",
  },
  {
    q: "De ce pachetele de cazino sunt mai scumpe?",
    a: "Publicarea de conținut din zona iGaming/pariuri/cazino presupune responsabilitate legală suplimentară, verificări de conformitate și acceptarea din partea editorilor. Tariful reflectă acest efort adițional.",
  },
  {
    q: "Pot vedea lista completă a celor 50 ziare?",
    a: "Da, lista e publică pe mediaexpress.ro/reteaua-noastra, cu link către fiecare ziar: 41 de ziare locale (câte unul pe județ) și 9 naționale. Poți deschide oricare și vedea ce a publicat azi.",
  },
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export function FAQ() {
  return (
    <section className="section bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />
      <div className="container max-w-3xl">
        <div className="text-center">
          <p className="eyebrow">Întrebări frecvente</p>
          <h2 className="h2 mt-2">Răspunsuri rapide</h2>
        </div>
        <div className="mt-10">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionContent>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
