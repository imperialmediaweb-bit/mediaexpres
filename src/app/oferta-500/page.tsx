import type { Metadata } from "next";
import {
  Newspaper,
  Globe,
  Facebook,
  Link as LinkIcon,
  FileText,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Star,
  Zap,
  CreditCard,
} from "lucide-react";
import { PromoOffer } from "./PromoOffer";
import { promoDeadlineLabel } from "@/data/packages";

// Termenul rulant al ofertei — null dupa 31 decembrie (atunci nu se mai afiseaza).
const deadline = promoDeadlineLabel();
import { NewspaperDirectory } from "@/components/NewspaperDirectory";
import { BankTransferBox } from "@/components/BankTransferBox";
import { ClientTestimonials } from "@/components/ClientTestimonials";
import { OfferChatBubble } from "@/components/OfferChatBubble";

export const metadata: Metadata = {
  title: "Articol în 50 de ziare — 500 lei",
  description:
    "Ofertă limitată: articolul tău publicat în 50 de ziare românești pentru 500 lei. 41 ziare locale + 9 naționale, 50 backlinks, raport PDF în 4h.",
  robots: { index: false, follow: false },
};

// Pagina se regenereaza din ora in ora ca mentiunea termenului limita sa
// dispara singura dupa expirare, fara redeploy.
export const revalidate = 3600;

const INCLUDED = [
  {
    icon: Newspaper,
    title: "50 de articole UNICE",
    description:
      "Nu publicăm copii. Fiecare ziar primește o variantă rescrisă unic — alt titlu, altă formulare, altă adresă — cu același mesaj și aceleași linkuri. Google vede 50 de articole diferite, nu unul copiat de 50 de ori.",
  },
  {
    icon: Zap,
    title: "Trimise imediat la indexare",
    description:
      "După publicare, fiecare articol e trimis automat către Google pentru indexare. Nu aștepți să te descopere singur — intri în rezultate în ore, nu în săptămâni.",
  },
  {
    icon: Globe,
    title: "41 locale + 9 naționale",
    description:
      "Câte un ziar pentru fiecare județ, plus 9 publicații naționale. Acoperire completă dintr-un singur plasament.",
  },
  {
    icon: LinkIcon,
    title: "50 backlinks dofollow, DA 37+",
    description:
      "Linkuri reale, permanente, din 50 de domenii .ro diferite — nu de pe subpagini ale aceluiași site. Autoritate de domeniu 37+, efect direct și durabil pe SEO-ul tău.",
  },
  {
    icon: Facebook,
    title: "Distribuire pe 50 pagini Facebook",
    description:
      "Fiecare publicație are pagina ei de Facebook, cu între 300 și 10.000 de urmăritori. Inclus, fără cost extra.",
  },
  {
    icon: FileText,
    title: "Raport PDF complet",
    description:
      "Primești toate cele 50 de URL-uri, în PDF și Excel — dă click pe fiecare și verifici publicarea.",
  },
  {
    icon: Clock,
    title: "Publicat în 4 ore",
    description:
      "De la confirmarea comenzii până la linkurile live trec maximum 4 ore lucrătoare.",
  },
];

// Ordinea pasilor e psihologia paginii: varianta veche incepea cu "Platesti" —
// adica cerea banii inainte sa ofere ceva, cea mai grea incadrare posibila
// pentru un vanzator necunoscut dintr-o reclama. Aceeasi realitate, spusa in
// ordinea in care omul se simte in siguranta.
const STEPS = [
  {
    n: "1",
    title: "Trimiți articolul",
    text: "Textul și pozele tale — sau doar tema, și îl scriem noi. Alegi cum plătești: card sau ordin de plată, cu factură fiscală.",
  },
  {
    n: "2",
    title: "Primești factura și plătești",
    text: "La card, factura vine automat după plată. La OP, îți trimitem factura pe email și plătești pe baza ei — ca între firme.",
  },
  {
    n: "3",
    title: "Publicăm și primești raportul",
    text: "În maximum 4 ore lucrătoare de la încasare, articolul e live în toate cele 50 de ziare. Primești raportul cu fiecare link.",
  },
];

const CONDITIONS = [
  {
    title: "Articol permanent pe site",
    detail:
      "Odată publicat, articolul rămâne online. Nu se șterge după o perioadă, iar backlinkurile rămân active.",
  },
  {
    title: "12 ore pe prima pagină",
    detail:
      "Articolul stă 12 ore pe pagina principală a fiecărei publicații, apoi trece în secțiunea lui permanentă.",
  },
  {
    title: "3 poze incluse",
    detail:
      "Trimiți până la 3 imagini, dintre care una o alegi ca imagine reprezentativă a articolului.",
  },
  {
    title: "Distribuire pe Facebook — opțional",
    detail:
      "Poți alege dacă articolul se distribuie și pe paginile de Facebook ale publicațiilor. Fără cost suplimentar.",
  },
];

const FAQ = [
  {
    q: "De ce 500 lei și nu 1.500?",
    a: `Este o ofertă promoțională de intrare, pentru clienți noi care nu au lucrat încă cu noi${deadline ? `, valabilă până pe ${deadline}` : ""}. Pachetul Național 50 costă în mod normal 1.500 lei. Vrem să testezi rețeaua la risc minim — dacă îți place rezultatul, rămâi.`,
  },
  {
    q: "Cum plătesc și primesc factură?",
    a: "Cum îți e mai ușor: cu cardul (prin Stripe, factura vine automat pe email) sau prin ordin de plată — comanzi, îți trimitem factura fiscală, iar contabilitatea ta plătește pe baza ei. Nu trebuie să fi plătit ca să comanzi.",
  },
  {
    q: "De ce costă dublu pentru cazino și pariuri?",
    a: "Conținutul din zona iGaming are cerințe suplimentare de conformitate (ONJN, mențiuni despre joc responsabil) și un risc editorial mai mare pentru publicații. De aceea tariful este 1.000 lei în loc de 500. Bifezi declarația la comandă. Dacă un articol de cazino este trimis nedeclarat, publicarea se oprește și suma nu se rambursează.",
  },
  {
    q: "E același articol copiat pe toate ziarele? Nu penalizează Google?",
    a: "Nu e copiat. Fiecare ziar primește o variantă unică a articolului: alt titlu, altă formulare, altă adresă URL — același mesaj, aceleași date de contact și aceleași linkuri către site-ul tău. Zero conținut duplicat între publicații. Iar „canibalizarea” de care se vorbește e o problemă doar între paginile propriului tău site — articolele apar pe domeniile noastre și trimit linkuri către tine, exact ce contează pentru SEO.",
  },
  {
    q: "Sunt ziare reale sau site-uri fantomă?",
    a: "Sunt reale. Rețeaua MediaExpres include 50 de domenii .ro proprii, fiecare cu trafic SEO propriu, indexare Google și pagină de Facebook activă. Lista completă e publicată mai sus pe această pagină — dă click pe orice ziar și verifică singur.",
  },
  {
    q: "Ce fel de conținut acceptați?",
    a: "Acceptăm orice tip de conținut comercial legal — lansări de produs, comunicate, advertoriale, articole de brand. Nu adăugăm eticheta (P) la articole.",
  },
  {
    q: "Pot să-mi scriu eu articolul?",
    a: "Da, iar asta e varianta recomandată. Trimiți textul tău, 3 poze și până la 3 linkuri. Dacă preferi, îl redactăm noi pe baza temei tale, la cerere.",
  },
  {
    q: "Articolele rămân online permanent?",
    a: "Da. Articolele rămân publicate permanent, nu se șterg după o perioadă. Backlinkurile rămân active.",
  },

];

export default function Oferta500Page() {
  return (
    <div className="bg-white">
      {/* Hero — id-ul e tinta barei fixe de pe mobil ("Comanda acum") */}
      <section id="oferta" className="bg-brand-navy text-white">
        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-gold/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-gold">
              <Star className="h-3 w-3 fill-current" />
              {deadline
                ? `Ofertă limitată — valabilă până pe ${deadline}`
                : "Ofertă limitată"}
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold leading-tight md:text-6xl">
              Articolul tău în{" "}
              <span className="text-brand-gold">50 de ziare</span> românești
            </h1>
            <p className="mt-6 text-lg text-white/85 md:text-xl">
              41 de ziare locale + 9 naționale. Un singur articol, publicat pe
              toate, în 4 ore. Cu raport PDF și 50 de backlinks reale.
            </p>

            <div className="mt-10">
              <PromoOffer />
            </div>
            <p className="mt-4 text-sm text-white/60">
              Card sau ordin de plată • factură fiscală • publicare în 4h
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container py-12">
          <div className="grid gap-8 text-center md:grid-cols-4">
            <Stat value="50" label="ziare online" />
            {/* "320.000+ vizitatori" era neverificabila si argumentul gresit:
                omul nu cumpara traficul site-urilor noastre, ci aparitia in
                presa si linkurile. Domeniile sunt verificabile — lista e mai
                jos in pagina. */}
            <Stat value="50" label="domenii .ro proprii" />
            <Stat value="50" label="backlinks dofollow" />
            <Stat value="4h" label="până la publicare" />
          </div>
        </div>
      </section>

      {/* Dovada sociala vine devreme: increderea se castiga inainte de pret,
          nu dupa. Titlul e la singular cinstit — avem un client care a scris,
          nu un cor; "Nu doar noi zicem" promitea plural si livra unul. */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Ce spun clienții</p>
            <h2 className="h2 mt-2">Din partea unui client, nu a noastră</h2>
          </div>
          <div className="mt-10">
            <ClientTestimonials />
          </div>
        </div>
      </section>

      {/* Ce include */}
      <section className="section">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Ce include oferta</p>
            <h2 className="h2 mt-2">Tot ce primești pentru 500 de lei</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {INCLUDED.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <item.icon className="h-8 w-8 text-brand-red" />
                <h3 className="mt-4 font-serif text-lg font-bold text-brand-navy">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cum functioneaza */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Cum funcționează</p>
            <h2 className="h2 mt-2">Trei pași până la 50 de publicări</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-xl border border-slate-200 bg-white p-8"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-red font-serif text-xl font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-5 font-serif text-xl font-bold text-brand-navy">
                  {s.title}
                </h3>
                <p className="mt-3 text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparatie */}
      <section className="section">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border-2 border-brand-red/20 bg-white p-8 md:p-12">
            <p className="eyebrow">De ce merită</p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-brand-navy md:text-3xl">
              500 de lei pentru 50 de publicări înseamnă 10 lei pe ziar
            </h2>
            <p className="mt-4 text-slate-600">
              Un singur advertorial cumpărat direct de la o publicație locală
              costă între 150 și 400 de lei. Aici plătești 10 lei per publicare
              și primești în plus distribuirea pe Facebook, backlinkul dofollow
              și raportul cu dovezi.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Fără abonament, fără obligații ulterioare",
                "Fără costuri ascunse — 500 lei este prețul final",
                "Factură fiscală și contract de prestări servicii",
                "Articolele rămân online permanent",
              ].map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
                  <span className="text-slate-700">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Lista ziarelor — vizibila inainte de plata, cu linkuri.
          id-ul e tinta butonului "Vezi lista" de sub CTA. */}
      <section id="lista-ziare" className="section scroll-mt-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Transparență totală</p>
            <h2 className="h2 mt-2">Vezi exact unde se publică</h2>
            <p className="mt-4 text-slate-600">
              Nu cumperi pe încredere. Astea sunt publicațiile — dă click pe
              oricare și convinge-te că sunt reale.
            </p>
          </div>
          <div className="mt-10">
            <NewspaperDirectory />
          </div>

          {/* Omul tocmai a verificat ca ziarele sunt reale — momentul cu cea mai
              mare incredere din toata pagina. Fara buton aici, trebuia sa se
              intoarca singur sus. */}
          <div className="mt-10 text-center">
            <a
              href="#oferta"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-8 py-4 text-lg font-bold text-white shadow-xl shadow-brand-red/20 transition hover:bg-brand-red/90 sm:w-auto"
            >
              <CreditCard className="h-5 w-5" />
              Comandă acum — 500 lei
            </a>
            <p className="mt-3 text-sm text-slate-500">
              Publicare în 4 ore lucrătoare · articol unic pe fiecare ziar · factură fiscală
            </p>
          </div>
        </div>
      </section>

      {/* Conditii de publicare */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Condiții de publicare</p>
            <h2 className="h2 mt-2">Exact ce se întâmplă cu articolul tău</h2>
          </div>
          <ul className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
            {CONDITIONS.map((c) => (
              <li
                key={c.title}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
                <span>
                  <strong className="text-brand-navy">{c.title}</strong>
                  <span className="mt-1 block text-sm text-slate-600">
                    {c.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Plata prin transfer bancar */}
      <section className="section">
        <div className="container">
          <BankTransferBox note="Nu e obligatoriu cardul. Poți plăti prin OP: 500 lei (standard) sau 1.000 lei (cazino/iGaming)." />
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="h2 text-center">Întrebări frecvente</h2>
            <div className="mt-10 space-y-4">
              {FAQ.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-xl border border-slate-200 bg-white p-5"
                >
                  <summary className="cursor-pointer list-none font-semibold text-brand-navy marker:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {f.q}
                      <span className="text-xl text-brand-red transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-brand-navy text-white">
        <div className="container py-16 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-brand-gold" />
          <h2 className="h2 mt-5 text-white">
            50 de ziare. 4 ore. 500 de lei.
          </h2>
          <p className="lead mx-auto mt-4 max-w-2xl text-white/85">
            Ofertă limitată pentru clienți noi. Comanzi acum, trimiți articolul,
            iar mâine ai raportul cu toate cele 50 de linkuri.
          </p>
          <div className="mt-8">
            <PromoOffer showPrice={false} />
          </div>
        </div>
      </section>

      {/* Consultantul raspunde la nesiguranta de dinainte de plata */}
      <OfferChatBubble />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-serif text-4xl font-bold text-brand-red">{value}</p>
      <p className="mt-1 text-sm uppercase tracking-wider text-brand-navy">
        {label}
      </p>
    </div>
  );
}
