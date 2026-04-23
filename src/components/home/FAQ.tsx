import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "În cât timp îmi este publicat articolul?",
    a: "În maximum 24h de la confirmarea plății și primirea textului. De obicei, publicarea se face în același zi, iar linkurile sunt livrate pe email cu raport parțial, urmat de raportul PDF complet.",
  },
  {
    q: "Pot trimite articol gata scris sau îl redactați voi?",
    a: "Ambele variante. Poți trimite textul gata scris (îl publicăm ca atare), sau poți să ne dai doar punctele-cheie și scriem noi un articol profesionist, optimizat SEO, pentru presă.",
  },
  {
    q: "Pot alege pe ce ziare apar?",
    a: "Pentru pachetul Local, da — alegi ziarul dorit dintr-o listă. Pentru Regional alegi zona (Moldova / Transilvania / Muntenia / Banat). Pentru Național 50, articolul apare pe toate cele 50 de ziare partenere.",
  },
  {
    q: "Cât timp rămâne articolul online?",
    a: "Permanent. Articolele rămân online pe site-urile partenere atâta timp cât acele site-uri funcționează — minim câțiva ani, de regulă.",
  },
  {
    q: "De ce pachetele de cazino sunt mai scumpe?",
    a: "Publicarea de conținut din zona iGaming/pariuri/cazino presupune responsabilitate legală suplimentară, verificări de conformitate și acceptarea din partea editorilor. Tariful reflectă acest efort adițional.",
  },
  {
    q: "Pot vedea lista completă a celor 50 ziare?",
    a: "Da, îți trimitem lista completă în format PDF pe email, gratuit — completezi formularul de pe pagina de pachete și o primești în 2 minute.",
  },
];

export function FAQ() {
  return (
    <section className="section bg-white">
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
