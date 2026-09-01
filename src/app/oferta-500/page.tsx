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
  Award,
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
    "Ofertă limitată: articolul tău publicat în 50 de ziare românești pentru 500 lei. 41 ziare locale + 9 naționale, 50 backlinks, raport PDF în 24 de ore lucrătoare.",
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
    icon: Award,
    title: "50 de apariții în presă, de folosit oriunde",
    description:
      "După publicare ai 50 de linkuri din presă pe care le poți arăta: pe site-ul tău la secțiunea Presa despre noi, în oferte, în emailuri către clienți, pe rețelele tale. A apărea în presă cântărește altfel decât a scrie pe propriul site — iar linkurile rămân valabile ani de zile.",
  },
  {
    icon: Zap,
    title: "Trimise la indexare, în ziua publicării",
    description:
      "Fiecare articol e anunțat automat la Google, Bing și Yandex imediat ce apare — la Google prin API-ul oficial de indexare, nu doar prin sitemap. Nu așteaptă să fie descoperit de crawler. Momentul indexării îl decide fiecare motor de căutare.",
  },
  {
    icon: Globe,
    title: "41 locale + 9 naționale",
    description:
      "Câte un ziar pentru fiecare județ, plus 9 publicații naționale. Acoperire completă dintr-un singur plasament.",
  },
  {
    icon: LinkIcon,
    title: "50 backlinks dofollow, DA 36+ pe toate domeniile",
    description:
      "Linkuri reale, permanente, din 50 de domenii .ro diferite — nu de pe subpagini ale aceluiași site. Domain Authority 36–37 pe toate, măsurat de Moz. Linkurile rămân active și după ani, fără să plătești nimic în plus.",
  },
  {
    icon: Facebook,
    title: "Distribuire pe 50 pagini Facebook",
    description:
      "Fiecare publicație are pagina ei de Facebook, cu între 300 și 10.000 de urmăritori. Inclus, fără cost extra — articolul ajunge pe paginile publicațiilor odată cu publicarea pe site.",
  },
  {
    icon: FileText,
    title: "Raport PDF complet",
    description:
      "Primești toate cele 50 de URL-uri, în PDF și Excel — dă click pe fiecare și verifici publicarea.",
  },
  {
    icon: Clock,
    title: "Publicat în 24 de ore lucrătoare",
    description:
      "De la confirmarea plății până la linkurile live trec maximum 24 de ore lucrătoare.",
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
    text: "Primești factura fiscală pe email după comandă, în ambele cazuri. La OP plătești pe baza ei, ca între firme.",
  },
  {
    n: "3",
    title: "Publicăm și primești raportul",
    text: "În maximum 24 de ore lucrătoare de la încasare, articolul e live în toate cele 50 de ziare. Primești raportul cu fiecare link.",
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
    title: "Distribuire pe Facebook — inclusă, o poți refuza",
    detail:
      "Articolul se distribuie automat pe paginile de Facebook ale publicațiilor, fără cost suplimentar. Dacă preferi doar publicarea pe site, debifezi la comandă. Postările le vezi direct pe pagini — raportul PDF adună linkurile de pe site-uri, pe care le poți verifica unul câte unul.",
  },
];

const FAQ = [
  {
    q: "De ce 500 lei și nu 1.500?",
    a: `Este o ofertă promoțională de intrare, pentru clienți noi care nu au lucrat încă cu noi${deadline ? `, valabilă până pe ${deadline}` : ""}. Pachetul Național 50 costă în mod normal 1.500 lei. Vrem să testezi rețeaua la risc minim — dacă îți place rezultatul, rămâi.`,
  },
  {
    q: "Cum plătesc și primesc factură?",
    a: "Cum îți e mai ușor: cu cardul, prin Stripe, sau prin ordin de plată. În ambele cazuri primești factura fiscală pe email după comandă — la OP, contabilitatea ta plătește pe baza ei. Nu trebuie să fi plătit ca să comanzi.",
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
    // Intrebarile astea trei au consumat, intr-o singura zi, aproape o ora de
    // WhatsApp cu un om care oricum n-avea sa cumpere. Puse aici, il lasa sa se
    // descalifice singur inainte sa scrie — si il conving pe cel potriv  {
    q: "Sunt ziare tipărite sau site-uri online?",
    a: "Online — 50 de site-uri de știri, câte unul pentru fiecare județ, plus cele naționale. Avantajul față de tipărit: un articol din ziarul de hârtie se citește o zi și dispare, pe când al tău rămâne online permanent, poate fi găsit oricând în căutări și îți lasă un link către site.",
  },
  {
    q: "Ce autoritate au domeniile? Linkurile chiar contează pentru SEO?",
    a: "Toate cele 50 de domenii au Domain Authority 36+ (scorul Moz, de la 0 la 100) și peste 120 de domenii care fac linkuri către fiecare. Un blog nou are DA 1–5, deci diferența e mare. Linkurile sunt dofollow, de pe 50 de domenii .ro diferite — nu subpagini ale aceluiași site — și rămân permanent. Scorul e public și verificabil de oricine, pentru orice domeniu din listă.",
  },
  {
    q: "Articolele ajung în Google?",
    a: "Fiecare articol e trimis automat la indexare imediat după publicare — la Google prin API-ul oficial de indexare, plus Bing și Yandex. Nu așteptăm să-l descopere crawlerul. Momentul exact în care intră în index îl decide fiecare motor de căutare, de regulă între câteva ore și câteva zile. La cerere, îți spunem starea articolelor tale.",
  },
  {
    q: "Sunt ziare reale sau site-uri fantomă?",
    a: "Sunt reale, cu redacții reale: fiecare publicație are jurnalistul ei și publică constant — peste 1.200 de articole publicate zilnic în rețea, plus distribuția pe paginile de Facebook asociate. Lista completă e publicată mai sus pe această pagină — dă click pe orice ziar, citește ce a apărut azi și verifică singur.",
  },
  {
    q: "Ce fel de conținut acceptați?",
    a: "Conținut comercial legal: lansări de produs, comunicate, advertoriale, articole de brand. Nu adăugăm eticheta (P). Nu publicăm însă articole despre cauzele sau tratarea bolilor — inclusiv cancer sau afecțiuni grave — nici produse sau terapii prezentate ca alternativă la tratamentul medical. La comandă bifezi o declarație că articolul nu intră în aceste categorii: dacă declarația se dovedește falsă, comanda se anulează și suma nu se restituie. Dacă noi refuzăm dintr-un alt motiv, returnăm integral în 3 zile lucrătoare.",
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
              toate, în 24 de ore lucrătoare. Cu raport PDF și 50 de backlinks reale.
            </p>
          {/* Cifra de audienta pe PRIMUL ecran, inclusiv pe telefon — jos, in
              dreptul butoanelor, cadea sub margine la 390px si n-o vedea fix
              publicul din reclama. Dovada completa ramane la lista (ancora). */}
          <p className="mx-auto mt-3 max-w-2xl">
            <a
              href="#dovada-facebook"
              className="text-sm font-semibold text-brand-gold underline decoration-brand-gold/40 underline-offset-4 hover:decoration-brand-gold"
            >
              ★ Pe Facebook: 2,4 mil. vizualizări în 28 de zile, doar pe cea mai mare pagină din rețea — vezi dovada ↓
            </a>
          </p>
          {/*
            Usa spre raspunsuri, inainte de pret si de butonul de comanda.
            O zi intreaga de WhatsApp s-a dus pe trei intrebari — cate ziare,
            ce trafic au, sunt tiparite? — puse de oameni care nu gaseau
            raspunsul si scriau. Prima varianta a butonului statea langa pret
            si cadea la y=1052 pe un ecran de 844: invizibila fix pentru
            publicul din reclama, care intra de pe telefon.

            Textul nu mai spune „ce trafic" si „ce nu iti promitem". Cifrele
            raman intregi la #detalii — cine verifica le gaseste si ramane,
            fiindcă le-am spus noi primii. Dar pe primul ecran ridicau o
            indoiala celui care n-avea niciuna: omul intrat din reclama nu se
            gandise la trafic pana nu i-am scris noi cuvantul sub titlu.

            Ancora duce la #lista-ziare, nu la #detalii: textul promite cele
            50 de ziare, deci trebuie sa livreze lista. Prima varianta cadea
            in „Nu vindem trafic" — exact indoiala pe care o mutasem de aici.
            Cifrele raman la #detalii, unde ajunge cine deruleaza mai jos.
          */}
          <p className="mx-auto mt-4 max-w-2xl">
            <a
              href="#lista-ziare"
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-2 text-sm font-semibold text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Vezi cele 50 de ziare și ce primești exact →
            </a>
          </p>

            <div className="mt-10">
              <PromoOffer />
            </div>
            <p className="mt-4 text-sm text-white/60">
              Card sau ordin de plată • factură fiscală • publicare în 24 de ore lucrătoare
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
            <Stat value="1.200+" label="articole publicate zilnic în rețea" />
            <Stat value="24 de ore lucrătoare" label="până la publicare" />
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

          {/*
            Cifrele de aici sunt din Meta Insights, pagina Botosani Expres,
            3–30 august 2026 — captura primita de la proprietar. Perioada e
            spusa explicit tocmai ca cifra sa nu poata fi contestata in
            comentariile de la reclama, cum au fost contestate cifrele vagi
            de trafic pe care le-am scos de pe site. Cand cifrele se schimba,
            se schimba AICI si in eticheta de perioada, impreuna.
          */}
          {/*
            Autoritatea domeniilor, spusa ca text si invitand la verificare.
            NU punem capturi din Moz: oricine poate verifica gratuit in 30 de
            secunde, deci o captura n-ar adauga incredere, dar ar parea aleasa
            de noi. Un numar plus "verifica singur" e mai puternic.
            Nu pomenim cuvintele-cheie pe care rankeaza ziarele: nu vindem
            pozitii in Google, vindem backlinkuri de pe domenii puternice —
            iar aia e afirmatia pe care o putem sustine.
          */}
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-brand-red">
              De ce contează unde apare articolul
            </p>
            <h3 className="mt-2 text-center font-serif text-2xl font-bold text-brand-navy">
              50 de recomandări, de pe 50 de site-uri puternice
            </h3>

            <div className="mx-auto mt-5 max-w-2xl space-y-4 text-sm leading-relaxed text-slate-600">
              <p>
                Google judecă un site după cine îl recomandă. Un link primit de pe un site
                puternic e ca o recomandare din partea cuiva de încredere. Unul de pe un blog
                pe care nu-l cunoaște nimeni nu cântărește aproape nimic.
              </p>
              <p>
                Puterea unui site se măsoară cu un scor de la 0 la 100, numit{" "}
                <strong className="text-brand-navy">Domain Authority</strong>. Un blog nou are
                1–5. Ziarele din rețeaua noastră au{" "}
                <strong className="text-brand-navy">36–37 — toate, nu doar câteva</strong>, cu
                peste 120 de site-uri care fac linkuri către fiecare.
              </p>
              <p>
                Tu primești <strong className="text-brand-navy">50 de astfel de recomandări
                dintr-o dată</strong>, de pe 50 de domenii diferite, și rămân permanent.
              </p>
              {/*
                Argumentul care le leaga pe celelalte doua si pe care il intelege
                oricine: Google trece des pe unde se intampla ceva. Un domeniu
                parcat, oricat de vechi si de puternic, e vizitat rar.
              */}
              <p>
                Și încă ceva, care cântărește la fel de mult:{" "}
                <strong className="text-brand-navy">site-urile sunt vii</strong>. În rețea apar
                peste 1.200 de articole în fiecare zi, deci motoarele de căutare trec pe ele
                constant. Un domeniu ținut doar pentru linkuri, oricât de vechi, e vizitat rar —
                articolul tău ar aștepta săptămâni. Aici e găsit repede, iar în ziua publicării
                îl anunțăm noi la Google, prin API-ul oficial de indexare.
              </p>
            </div>

            {/*
              Cifrele in fata, ca la cardul de Facebook: omul le vede, nu i se
              cere sa se documenteze singur. Sursa si data raman scrise, ca sa
              nu fie o afirmatie fara acoperire — si ca sa stim cand trebuie
              improspatate.
            */}
            <div className="mt-6 grid gap-4 text-center sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-3xl font-bold text-brand-navy">36–37</div>
                <div className="mt-1 text-sm text-slate-600">Domain Authority, pe toate cele 50</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-3xl font-bold text-brand-navy">120+</div>
                <div className="mt-1 text-sm text-slate-600">domenii care dau linkuri către fiecare ziar</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-3xl font-bold text-emerald-600">50</div>
                <div className="mt-1 text-sm text-slate-600">linkuri dofollow, permanente</div>
              </div>
            </div>
            <p className="mt-5 text-center text-sm text-slate-600">
              Sursa: Moz Domain Analysis, verificat în august 2026 — scor public, verificabil
              pentru oricare domeniu din listă. Un blog nou are Domain Authority 1–5.
            </p>
            <div className="hidden">
            </div>
          </div>

          <div id="dovada-facebook" className="mx-auto mt-12 max-w-3xl scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-brand-red">
              Cel mai citit ziar din rețea, pe Facebook
            </p>
            <h3 className="mt-2 text-center font-serif text-2xl font-bold text-brand-navy">
              Botoșani Expres: 2,4 milioane de vizualizări pe Facebook, în 28 de zile
            </h3>
            <div className="mt-6 grid gap-4 text-center sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-3xl font-bold text-brand-navy">2.430.444</div>
                <div className="mt-1 text-sm text-slate-600">vizualizări pe Facebook</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-3xl font-bold text-brand-navy">100.056</div>
                <div className="mt-1 text-sm text-slate-600">interacțiuni</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-3xl font-bold text-emerald-600">+90%</div>
                <div className="mt-1 text-sm text-slate-600">față de luna anterioară</div>
              </div>
            </div>
            <p className="mt-5 text-center text-sm text-slate-600">
              Sursa: statisticile Meta ale paginii, perioada 4–31 august. Toate cele 50 de
              ziare au pagini de Facebook active, fiecare cu publicul ei — aici am arătat-o
              doar pe cea mai citită. Articolul tău se distribuie pe{" "}
              <strong className="text-brand-navy">toate cele 50</strong>.{" "}
              <a
                href="https://botosaniexpres.ro"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-red underline"
              >
                Vezi ziarul live →
              </a>
            </p>
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
              Publicare în 24 de ore lucrătoare · articol unic pe fiecare ziar · factură fiscală
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

      {/*
        Datele, ca sectiune de sine statatoare — tinta butoanelor din antet si
        de langa comanda.
        Erau un raspuns lung in intrebari frecvente, adica un zid de text pe
        care nu-l citea nimeni. Aici sunt cifre, pe rand, inclusiv cele slabe:
        o zi intreaga de WhatsApp s-a dus pe intrebari la care raspunsul exista
        deja, doar ca ingropat.
      */}
      <section id="detalii" className="section scroll-mt-20">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="eyebrow">Fără surprize</p>
              <h2 className="h2 mt-2">Datele, pe față</h2>
              <p className="mt-4 text-slate-600">
                Inclusiv cele care nu ne avantajează. Preferăm să știi dinainte ce cumperi.
              </p>
            </div>

            <div className="mt-10 space-y-4">
              <div className="rounded-2xl border-2 border-brand-red/20 bg-white p-6">
                <h3 className="font-serif text-lg font-bold text-brand-navy">
                  Nu vindem trafic. Iată cifrele reale.
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Sunt publicații locale, fiecare pentru județul ei, nu portaluri naționale.
                  Măsurat în Google Analytics, august 2026, traficul diferă foarte mult de la
                  o publicație la alta:
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4 text-center">
                    <div className="font-serif text-2xl font-bold text-brand-navy">20.000</div>
                    <div className="mt-1 text-xs text-slate-600">cea mai mare (Botoșani Expres), într-o lună</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center">
                    <div className="font-serif text-2xl font-bold text-brand-navy">câteva sute</div>
                    <div className="mt-1 text-xs text-slate-600">majoritatea publicațiilor</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center">
                    <div className="font-serif text-2xl font-bold text-brand-navy">câteva zeci</div>
                    <div className="mt-1 text-xs text-slate-600">cele mai noi din rețea</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  Rețeaua e tânără și în creștere. Dacă ce cauți sunt strict vizitatori direcți
                  pe site-ul tău, <strong className="text-brand-navy">îți spunem de la început
                  că nu asta e soluția potrivită</strong>.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="font-serif text-lg font-bold text-brand-navy">
                    Unde e audiența: pe Facebook
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Fiecare publicație are pagina ei, iar articolul se distribuie automat.
                    Cea mai mare pagină din rețea, Botoșani Expres, a avut{" "}
                    <strong className="text-brand-navy">2,4 milioane de vizualizări</strong> și
                    100.056 interacțiuni într-o singură lună (statistici Meta, august 2026).
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="font-serif text-lg font-bold text-brand-navy">
                    Ce cumperi de fapt
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                    <li>50 de linkuri dofollow permanente, DA 36–37</li>
                    <li>50 de apariții în presă, de arătat clienților tăi</li>
                    <li>Prezență care rămâne online și peste ani</li>
                    <li>Distribuire pe paginile de Facebook</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl bg-brand-navy p-6 text-center md:p-8">
                <p className="font-serif text-xl font-bold text-white">
                  Ai văzut tot, inclusiv ce nu ne avantajează.
                </p>
                <p className="mx-auto mt-2 max-w-lg text-sm text-white/75">
                  Dacă asta cauți, comanda durează două minute. Publicăm în maximum 24 de ore
                  lucrătoare și primești raportul cu toate linkurile.
                </p>
                <a
                  href="#oferta"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-8 py-4 text-lg font-bold text-white shadow-xl shadow-brand-red/20 transition hover:bg-brand-red/90 sm:w-auto"
                >
                  <CreditCard className="h-5 w-5" />
                  Comandă acum — 500 lei
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intrebari frecvente */}
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
            50 de ziare. 24 de ore lucrătoare. 500 de lei.
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
