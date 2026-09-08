import type { Metadata } from "next";
import Link from "next/link";
import {
  Newspaper,
  Globe,
  Facebook,
  FileText,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Star,
  Award,
  CreditCard,
  Layers,
  Link as LinkIcon,
  Image as ImageIcon,
  Megaphone,
  XCircle,
  Users,
  Check,
} from "lucide-react";
import { PromoOffer } from "./PromoOffer";
import { promoDeadlineLabel } from "@/data/packages";

// Termenul rulant al ofertei — null dupa 31 decembrie (atunci nu se mai afiseaza).
const deadline = promoDeadlineLabel();
import { NewspaperDirectory } from "@/components/NewspaperDirectory";
import { ClientTestimonials } from "@/components/ClientTestimonials";
import { OfferChatBubble } from "@/components/OfferChatBubble";
import { DateFirma } from "@/components/DateFirma";

/*
  06.09.2026 — pagina vindea DOUA produse deodata.
  Jumatate vindea SEO (Domain Authority, „50 de recomandari pentru Google",
  linkuri care transmit autoritate), jumatate vindea aparitii in presa.
  Cele doua se bateau cap in cap la citit, iar promisiunea de SEO era cea
  care ne expunea: un link conteaza doar daca pagina de pe care vine e
  indexata, si asta o decide Google. Vandut ca „linkuri care iti cresc
  autoritatea", clientul verifica peste doua luni, nu vede nimic
  schimbat, si cere inapoi mai mult decat am castigat.

  (Nota, 06.09 dupa-amiaza: la un moment dat reteaua a marcat linkurile ca
  fiind continut platit, apoi a scos marcajul. Acum sunt obisnuite, fara
  atribute care le anuleaza — asta e ce scrie si pe pagina.)

  Un singur produs, de aici incolo: APARITII IN PRESA. 50 de publicatii,
  500 de lei, raman permanent, primesti lista cu toate linkurile. Pentru
  firme care trebuie sa arate cuiva ca s-a scris despre ele — dosare de
  finantare, licitatii, banci, parteneri, „Presa despre noi".

  Cifrele au data si sursa langa ele: o cifra adevarata azi devine afirmatie
  falsa peste trei luni, iar pagina ramane online.
*/

export const metadata: Metadata = {
  title: "Firma ta în 50 de ziare — 500 lei",
  description:
    "Articolul tău publicat în 50 de ziare românești pentru 500 lei. Rămâne permanent și primești lista cu toate cele 50 de linkuri, de pus pe site la „Apariții în presă”.",
  robots: { index: false, follow: false },
};

// Pagina se regenereaza din ora in ora ca mentiunea termenului limita sa
// dispara singura dupa expirare, fara redeploy.
export const revalidate = 3600;

const INCLUDED = [
  {
    icon: Newspaper,
    title: "50 de publicații, dintr-o singură comandă",
    description:
      "41 de ziare locale, câte unul pentru fiecare județ, plus 9 publicații naționale. Un singur articol, trimis o singură dată.",
  },
  {
    icon: Award,
    title: "Rămâne permanent",
    description:
      "Nu expiră ca o reclamă plătită. Peste doi ani articolul e la aceeași adresă și linkurile funcționează la fel. Nu se șterge și nu plătești nimic în plus.",
  },
  {
    icon: Layers,
    title: "Text diferit pe fiecare ziar",
    description:
      "Nu 50 de copii identice. Fiecare publicație primește altă formulare și alt titlu, cu același mesaj și aceleași date de contact. Deschide două linkuri din raport și vezi diferența.",
  },
  {
    // 06.09.2026, dupa-amiaza — reteaua a scos marcajul de continut platit:
    // linkurile sunt acum obisnuite, fara atribute care le anuleaza. Se poate
    // spune, si e verificabil in codul paginii. Ce ramane interzis e
    // PROMISIUNEA de rezultat: un link conteaza doar daca pagina de pe care
    // vine e indexata, iar asta o decide Google. Cine garanteaza pozitii
    // ajunge sa dea banii inapoi peste doua luni, cu vorba proasta pe deasupra.
    icon: LinkIcon,
    title: "50 de linkuri către site-ul tău",
    description:
      "Din fiecare articol, câte până la 3 linkuri către adresele tale, cu textul ales de tine. Permanente și fără atribute care le anulează.",
  },
  {
    icon: FileText,
    title: "Lista cu toate linkurile",
    description:
      "Primești pe email toate cele 50 de adrese, în PDF și Excel. Le pui pe site la „Apariții în presă” sau le trimiți partenerilor și clienților tăi.",
  },
  {
    icon: Facebook,
    title: "Distribuire pe paginile de Facebook",
    description:
      "Publicațiile își postează articolul pe paginile lor de Facebook, fără cost suplimentar. Poți refuza distribuirea la comandă, dacă vrei doar publicarea pe site.",
  },
  {
    // 06.09.2026 — inclus in pret, fara cifra de cost pe pagina: postarea
    // ziarului cu articolul primeste reclama platita 3 zile, pe ziarul ales
    // de client din lista (local, catre orasul lui, sau national). Raspunde
    // la „nu aduce vizitatori" fara sa promita cifre — si creste, in
    // trecere, pagina ziarului. Nu promitem afisari sau clickuri.
    icon: Megaphone,
    title: "Promovat 3 zile pe Facebook, prin reclamă",
    description:
      "Pe lângă postarea de pe pagina ziarului, articolul primește și reclamă plătită timp de 3 zile — pe ziarul pe care îl alegi tu din listă: local, către orașul tău, sau național. Inclus în preț.",
  },
  {
    icon: ImageIcon,
    title: "Până la 3 poze",
    description:
      "Trimiți până la 3 imagini, dintre care una devine imaginea principală a articolului. Dacă nu ai, publicăm fără.",
  },
  {
    icon: Clock,
    title: "Publicat în 12 ore lucrătoare",
    description:
      "De la confirmarea plății până la linkurile live trec maximum 12 ore lucrătoare — de obicei mai puțin. Comanda făcută seara sau în weekend se publică a doua zi lucrătoare.",
  },
  {
    // 06.09.2026 — argumentul cerut de proprietar: publicarea nu e o descarcare
    // automata, ci intra pe rand, ca orice stire preluata de o redactie.
    icon: Globe,
    title: "Publicare eșalonată, nu toate deodată",
    description:
      "Articolele intră pe rând, pe parcursul zilei, nu toate în aceeași secundă — cum apare orice știre, una după alta.",
  },
];

// La ce foloseste, in cuvintele clientului. Pana acum pagina spunea ce
// primeste, nu la ce ii trebuie — iar omul care avea nevoie de dovada
// pentru un dosar de finantare nu se recunostea nicaieri.
// Lista scurta din reclama. Creativul simplificat a scos-o de pe imagine —
// acolo aglomera mesajul pe telefon — dar oamenii o citesc: e felul in care
// omul isi recunoaste propria situatie intr-o enumerare. Locul ei e aici,
// unde are spatiu, imediat sub explicatiile lungi.
const RECOMANDAT_PENTRU = [
  "Comunicate de presă",
  "Campanii de PR",
  "Apariții în presă",
  "Promovarea firmei sau brandului",
  "Lansări de produse și servicii",
  "Evenimente și proiecte",
  "Creșterea notorietății",
];

const USES = [
  {
    title: "Dosare de finanțare și licitații",
    text: "Unde se cere „apariții în presă”, ai 50 — fiecare cu link către articol.",
  },
  {
    title: "Pagina „Presa despre noi”",
    text: "50 de apariții de pus pe site-ul tău. Cântărește altfel decât ce scrii singur despre tine.",
  },
  {
    title: "Credibilitate în fața băncilor și partenerilor",
    text: "Când cineva îți caută firma înainte să semneze, găsește articole în publicații, nu doar site-ul tău.",
  },
  {
    title: "Lansări, deschideri, aniversări, comunicate",
    text: "Un anunț care rămâne consemnat undeva, nu doar o postare care coboară în feed.",
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
    text: "Textul și pozele tale — sau doar tema, și îl scriem noi, inclus în preț. Alegi cum plătești: card sau ordin de plată, cu factură fiscală.",
  },
  {
    n: "2",
    title: "Primești factura și plătești",
    text: "Primești factura fiscală pe email după comandă, în ambele cazuri. La OP plătești pe baza ei, ca între firme.",
  },
  {
    n: "3",
    title: "Publicăm și primești lista",
    text: "În maximum 12 ore lucrătoare de la încasare, articolul e live în toate cele 50 de ziare. Primești lista cu fiecare link, în PDF și Excel.",
  },
];

const CONDITIONS = [
  {
    title: "Articol permanent pe site",
    detail:
      "Odată publicat, articolul rămâne online. Nu se șterge după o perioadă și nu expiră.",
  },
  {
    title: "12 ore pe prima pagină",
    detail:
      "Articolul stă 12 ore pe pagina principală a fiecărei publicații, apoi trece în secțiunea lui permanentă, la aceeași adresă.",
  },
  {
    title: "3 poze incluse",
    detail:
      "Trimiți până la 3 imagini, dintre care una o alegi ca imagine reprezentativă a articolului.",
  },
  {
    title: "Distribuire pe Facebook — inclusă, o poți refuza",
    detail:
      "Articolul se distribuie pe paginile de Facebook ale publicațiilor, fără cost suplimentar. Dacă preferi doar publicarea pe site, debifezi la comandă.",
  },
  {
    title: "Articol redacțional, fără eticheta (P)",
    detail:
      "Apare ca articol în publicație, nu ca banner sau reclamă marcată. Linkurile către tine sunt obișnuite, fără atribute care le anulează.",
  },
  {
    title: "Dacă nu publicăm la timp, primești banii înapoi",
    detail:
      "Nu publicăm în 12 ore lucrătoare de la încasare și de la primirea materialelor? Returnăm integral. Riscul e al nostru.",
  },
];

const FAQ = [
  {
    q: "De ce 500 lei și nu 1.500?",
    a: `Este o ofertă promoțională de intrare, pentru clienți noi care nu au lucrat încă cu noi${deadline ? `, valabilă până pe ${deadline}` : ""}. Pachetul Național 50 costă în mod normal 1.500 lei. Vrem să testezi rețeaua la risc minim — dacă îți place rezultatul, rămâi.`,
  },
  {
    q: "Cum plătesc și primesc factură?",
    a: "Cum îți e mai ușor: cu cardul, prin Stripe, sau prin ordin de plată. În ambele cazuri primești factura fiscală pe email după comandă — la OP, contabilitatea ta plătește pe baza ei. Nu trebuie să fi plătit ca să comanzi. 500 lei este prețul final: firma nu e plătitoare de TVA, deci nu se adaugă nimic peste.",
  },
  {
    q: "E același articol copiat pe toate ziarele?",
    a: "Nu e copiat. Fiecare ziar primește o variantă unică: alt titlu, altă formulare, altă adresă — același mesaj, aceleași date de contact și aceleași linkuri către site-ul tău. Deschide două linkuri din raport și compari. Dacă vrei textul tău identic peste tot (comunicat oficial, text aprobat juridic), spui la comandă și îl publicăm neschimbat.",
  },
  {
    q: "Sunt ziare tipărite sau site-uri online?",
    a: "Online — 50 de site-uri de știri, câte unul pentru fiecare județ, plus cele naționale. Avantajul față de tipărit: un articol din ziarul de hârtie se citește o zi și dispare, pe când al tău rămâne online permanent, la aceeași adresă, și poate fi arătat oricând.",
  },
  {
    q: "Sunt ziare reale sau site-uri fantomă?",
    a: "Fiecare publică zilnic articole despre județul lui — circa 600 de articole pe zi în toată rețeaua — plus pagina de Facebook unde își postează articolele: 46 de pagini, cu 37.323 de urmăritori. Cel mai simplu e să verifici singur: lista completă e mai sus, deschide orice ziar, citește ce a apărut azi și intră și pe pagina lui de Facebook.",
  },

  {
    q: "Îmi aduce vizitatori pe site?",
    a: "Puțini, și îți spunem asta dinainte. Un advertorial nu aduce trafic — nici la noi, nici la o publicație națională de 4.500 de lei. Aduce prezență: apari, rămâi, poți arăta. Ce facem în plus: promovăm postarea cu articolul tău 3 zile, prin reclamă pe Facebook, pe ziarul ales de tine — în orașul tău sau național. Nici așa nu promitem cifre. Dacă ce cauți sunt strict vizitatori pe site-ul tău, ai nevoie de o campanie de reclamă, nu de asta.",
  },
  {
    // 06.09.2026 — proprietarul, corect: „dar linkul chiar exista, si chiar e de
    // pe un domeniu cu DA 37". Asa e. Fals ar fi doar sa-l vindem ca instrument
    // de crestere in clasament. Raspunsul spune si ce primesti, si ce nu face —
    // si intoarce marcajul in avantaj, fiindca il poti verifica singur.
    q: "Primesc backlinkuri? Mă ajută la SEO?",
    a: "Primești 50 de linkuri către site-ul tău, de pe 50 de publicații de presă diferite — permanente și fără atribute care le anulează. Ce nu-ți promitem sunt poziții în Google: un link contează doar dacă pagina de pe care vine e indexată, iar asta o decide Google, nu noi. Cine îți garantează creșterea poziției nu spune adevărul.",
  },

  {
    q: "Articolele apar în Google?",
    a: "Trimitem fiecare articol la indexare în ziua publicării, prin canalele oficiale ale motoarelor de căutare. Când și dacă intră în index decide Google, nu noi — și nu promitem poziții. Ce îți garantăm e că articolul e publicat, are adresă proprie și rămâne acolo.",
  },
  {
    q: "De ce costă dublu pentru cazino și pariuri?",
    a: "Conținutul din zona iGaming are cerințe suplimentare de conformitate (ONJN, mențiuni despre joc responsabil) și un risc editorial mai mare pentru publicații. De aceea tariful este 1.000 lei în loc de 500. Bifezi declarația la comandă. Dacă un articol de cazino este trimis nedeclarat, publicarea se oprește și suma nu se rambursează.",
  },
  {
    q: "Ce fel de conținut acceptați?",
    a: "Conținut comercial legal: lansări de produs, comunicate, advertoriale, articole de brand. Nu publicăm articole despre cauzele sau tratarea bolilor — inclusiv cancer sau afecțiuni grave — nici produse sau terapii prezentate ca alternativă la tratamentul medical, și nici atacuri la persoană. La comandă bifezi o declarație că articolul nu intră în aceste categorii: dacă declarația se dovedește falsă, comanda se anulează, articolul se retrage și suma nu se restituie. Dacă noi refuzăm dintr-un alt motiv, returnăm integral în 3 zile lucrătoare.",
  },
  {
    q: "Pot să-mi scriu eu articolul?",
    a: "Da, iar asta e varianta recomandată. Trimiți textul tău, până la 3 poze și până la 3 linkuri. Dacă preferi, îl redactăm noi pe baza temei tale, fără cost suplimentar — îl citești și îl poți modifica înainte de publicare.",
  },
  {
    q: "Ce se întâmplă dacă articolul nu poate fi publicat?",
    a: "Dacă îl refuzăm noi la verificare, din alt motiv decât o declarație falsă, primești banii înapoi integral în 3 zile lucrătoare. Dacă un articol deja publicat trebuie retras la cererea unei autorități sau a unei persoane vizate, îl retragem și îți spunem de pe ce publicații.",
  },
  {
    q: "Articolele rămân online permanent?",
    a: "Da. Nu se șterg după o perioadă, nu expiră și nu plătești nimic ca să rămână. Linkurile din raport funcționează și peste ani.",
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
              Firma ta, în{" "}
              <span className="text-brand-gold">50 de ziare</span>. 500 de lei.
            </h1>
            {/*
              Titlul vechi („Articolul tau in 50 de ziare") spunea CE, nu LA CE
              FOLOSESTE. Omul care are nevoie de dovada pentru un dosar de
              finantare nu se recunostea nicaieri pe pagina.
            */}
            {/*
              06.09.2026 (proprietarul: „asta suna a teapa") — scria „de trimis
              la dosar, la banca, oriunde ai nevoie sa dovedesti". Cuvantul
              „dovedesti" pune clientul in postura de suspect, iar „la dosar"
              langa „la banca" miroase a hartii de fatarnicie. In primele trei
              secunde, unde omul decide daca esti serios, e exact tonul gresit.
              Formularea lui, care spune acelasi lucru ca beneficiu: „le poti
              pune pe site, la «Aparitii in presa»". Utilitatile de dosar si
              licitatie raman mai jos, in „La ce foloseste", unde au context.
            */}
            <p className="mt-6 text-lg text-white/85 md:text-xl">
              Publicat în maximum 12 ore lucrătoare. Rămâne permanent. Primești
              lista cu toate cele 50 de linkuri — le poți pune pe site, la
              „Apariții în presă”.
            </p>

            <p className="mx-auto mt-4 max-w-2xl">
              <a
                href="#lista-ziare"
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-2 text-sm font-semibold text-white/85 transition hover:border-white/50 hover:text-white"
              >
                Vezi cele 50 de ziare, înainte să comanzi →
              </a>
            </p>

            <div className="mt-10">
              <PromoOffer />
            </div>
            <p className="mt-4 text-sm text-white/60">
              Card sau ordin de plată • factură fiscală • 500 lei, preț final
            </p>
          </div>
        </div>
      </section>

      {/*
        Cele patru cifre de sus sunt lucruri pe care le PRIMESTE clientul.
        „~600 de articole pe zi in retea" statea aici si a fost scoasa
        (06.09.2026, proprietarul: „nu cred ca e relevanta asta") — are
        dreptate: cate articole publica reteaua nu-i spune cumparatorului
        nimic despre ce ia el pe 500 de lei. Cifra ramane mai jos, in
        sectiunea „Sunt ziare adevarate", unde chiar are treaba: acolo
        raspunde la „sunt site-uri fantoma?".
      */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container py-12">
          <div className="grid gap-8 text-center md:grid-cols-4">
            <Stat value="50" label="publicații online" />
            <Stat value="permanent" label="cât rămâne articolul" />
            <Stat value="46" label="pagini de Facebook" />
            <Stat value="12 ore lucrătoare" label="până la publicare" />
          </div>
        </div>
      </section>

      {/* Ce primesti */}
      <section className="section">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Ce include oferta</p>
            <h2 className="h2 mt-2">Tot ce primești pentru 500 de lei</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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

      {/* La ce foloseste */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">La ce folosește</p>
            <h2 className="h2 mt-2">Pentru ce cumpără oamenii asta</h2>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
            {USES.map((u) => (
              <div
                key={u.title}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
                <span>
                  <strong className="text-brand-navy">{u.title}</strong>
                  <span className="mt-1 block text-sm text-slate-600">{u.text}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-6 max-w-4xl rounded-2xl border-2 border-brand-red/20 bg-white p-6 md:p-8">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 shrink-0 text-brand-red" />
              <h3 className="font-serif text-xl font-bold text-brand-navy">Recomandat pentru</h3>
            </div>
            <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {RECOMANDAT_PENTRU.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-slate-700">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/*
        Lista ziarelor, mutata SUS (06.09.2026): e dovada, iar dovada convinge
        inainte de pret. Statea dupa cinci sectiuni, adica dupa ce omul deja
        decisese. Aici raspunde direct acuzatiei de „retea fantoma" —
        deschide oricare si citeste ce a aparut azi.
      */}
      <section id="lista-ziare" className="section scroll-mt-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Verifică singur</p>
            <h2 className="h2 mt-2">Sunt ziare adevărate</h2>
            {/*
              06.09.2026 (proprietarul: „asta e o mare porcarie") — avea
              dreptate. Varianta veche se apara pe trei randuri: „indiferent
              daca are clienti sau nu", „oameni reali comenteaza si dau like",
              cifre ingramadite. Cine se apara atat suna a vinovat, iar fraza
              „indiferent daca are clienti" spune singura ca ne-a acuzat cineva.
              Aratam, nu argumentam: doua propozitii calme si invitatia de a
              verifica. Cifrele stau oricum in blocul de dedesubt, cu sursa.
            */}
            <p className="mt-4 text-slate-600">
              Fiecare ziar publică zilnic articole despre județul lui: primărie,
              școli, spital, sport, evenimente. Articolul tău apare între aceste
              știri, iar ziarul îl postează pe pagina lui de Facebook, ca pe
              oricare altul.
            </p>
            <p className="mt-3 font-semibold text-brand-navy">
              Nu trebuie să ne crezi pe cuvânt. Lista e mai jos — deschide orice
              ziar și citește ce a apărut azi.
            </p>
          </div>
          <div className="mt-10">
            <NewspaperDirectory />
          </div>

          {/*
            Cifrele rețelei, cu data si sursa langa ele. Nu promit clientului
            nimic — arata doar ca ziarele sunt reale, nu goale. De improspatat
            impreuna cu eticheta de data, niciodata separat.
          */}
          <div id="dovada-facebook" className="mx-auto mt-12 max-w-3xl scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-brand-red">
              Cel mai citit ziar din rețea, pe Facebook
            </p>
            <h3 className="mt-2 text-center font-serif text-2xl font-bold text-brand-navy">
              Botoșani Expres: 2,4 milioane de afișări în 28 de zile
            </h3>
            <div className="mt-6 grid gap-4 text-center sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-3xl font-bold text-brand-navy">2.430.444</div>
                {/* „Afisari", nu „vizualizari" si nu „oameni": indicatorul Meta e
                    page_impressions si numara repetarile. */}
                <div className="mt-1 text-sm text-slate-600">afișări pe Facebook</div>
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
              Sursa: statisticile Meta ale paginii, 4–31 august 2026. Aici e doar
              cea mai citită pagină din rețea; articolul tău se distribuie pe{" "}
              <strong className="text-brand-navy">toate</strong>.{" "}
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

          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-brand-red">
              Rețeaua, în cifre măsurate
            </p>
            <h3 className="mt-2 text-center font-serif text-2xl font-bold text-brand-navy">
              Ultimele 28 de zile, pe toate cele 50
            </h3>
            <div className="mt-6 grid gap-4 text-center sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-2xl font-bold text-brand-navy">11.960</div>
                <div className="mt-1 text-xs text-slate-600">cititori unici</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-2xl font-bold text-brand-navy">43.546</div>
                <div className="mt-1 text-xs text-slate-600">vizualizări de pagină</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-2xl font-bold text-brand-navy">55.737</div>
                <div className="mt-1 text-xs text-slate-600">afișări în Google</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-2xl font-bold text-brand-navy">1.978</div>
                <div className="mt-1 text-xs text-slate-600">vizite din căutări</div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 text-center sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-2xl font-bold text-brand-navy">46</div>
                <div className="mt-1 text-xs text-slate-600">pagini de Facebook, 37.323 urmăritori</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-2xl font-bold text-brand-navy">~600</div>
                <div className="mt-1 text-xs text-slate-600">articole noi pe zi în rețea</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="font-serif text-2xl font-bold text-brand-navy">37 / 30</div>
                <div className="mt-1 text-xs text-slate-600">Domain Authority / Page Authority (Moz)</div>
              </div>
            </div>
            <p className="mt-5 text-center text-sm text-slate-600">
              Măsurat 6 septembrie 2026 — Google Search Console, statistici Meta și
              statisticile proprii ale publicațiilor. Scorul Moz e public: îl poți
              verifica singur pentru oricare domeniu din listă.
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
              Publicare în 12 ore lucrătoare · text diferit pe fiecare ziar · factură fiscală
            </p>
          </div>
        </div>
      </section>

      {/*
        06.09.2026 — argumentul proprietarului, trait: a platit 4.500 de lei
        pentru un singur articol pe o publicatie nationala si „au venit cativa
        vizitori". Muta discutia de la „merita 500?" la „merita 4.500?" si e
        credibil tocmai fiindca e impotriva noastra.
      */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border-2 border-brand-red/20 bg-white p-8 md:p-12">
            <p className="eyebrow">De ce merită</p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-brand-navy md:text-3xl">
              De ce 500 și nu 4.500
            </h2>
            <div className="mt-4 space-y-3 text-slate-600">
              <p>
                Am plătit odată 4.500 de lei pentru un singur articol pe o
                publicație națională mare. A venit o mână de oameni.
              </p>
              <p>
                Nu pentru că publicația e slabă — ci pentru că un advertorial nu
                aduce trafic, nicăieri. Nici la ei, nici la noi, nici la nimeni.{" "}
                <strong className="text-brand-navy">
                  Aduce prezență: apari, rămâi, poți arăta.
                </strong>{" "}
                Diferența e cât plătești pentru asta.
              </p>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-2 pr-4 font-semibold text-slate-500"></th>
                    <th className="py-2 pr-4 font-semibold text-slate-600">Un site național</th>
                    <th className="py-2 font-semibold text-brand-navy">Rețeaua Expres</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {[
                    ["Preț", "3.000 – 5.000 lei", "500 lei"],
                    ["Publicații", "1", "50"],
                    ["Cât rămâne", "permanent", "permanent"],
                    ["Trafic adus", "puțin", "puțin"],
                  ].map(([k, a, b]) => (
                    <tr key={k} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-slate-500">{k}</td>
                      <td className="py-2.5 pr-4">{a}</td>
                      <td className="py-2.5 font-semibold text-brand-navy">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-slate-600">
              Îți spunem pe față: și noi, și ei livrăm același lucru. Doar că la
              noi apari în 50 de locuri, cu de nouă ori mai puțini bani.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Fără abonament, fără obligații ulterioare",
                "Fără costuri ascunse — 500 lei este prețul final, nu suntem plătitori de TVA",
                "Factură fiscală și contract de prestări servicii",
                "Text diferit pe fiecare ziar, nu 50 de copii",
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

      {/*
        Sectiunea care vinde cel mai tare, tocmai fiindca nu vinde.
        Toti ceilalti promit Google. Cine spune pe fata ce NU livreaza e crezut
        si cand spune restul. Inlocuieste „Datele, pe fata" — aceeasi idee,
        fara cifrele de trafic care ridicau o indoiala in loc s-o stinga.
      */}
      <section id="detalii" className="section scroll-mt-20">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="eyebrow">Fără surprize</p>
              <h2 className="h2 mt-2">Ce NU îți promitem</h2>
              <p className="mt-4 text-slate-600">
                Preferăm să știi dinainte ce cumperi, decât să afli după.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-brand-red/20 bg-white p-6">
                <XCircle className="h-7 w-7 text-brand-red" />
                <h3 className="mt-3 font-serif text-lg font-bold text-brand-navy">
                  Nu-ți promitem prima pagină în Google
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Trimitem articolele la indexare în ziua publicării, dar când și
                  dacă apar în căutări decide Google. Cine îți garantează poziții
                  nu spune adevărul.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-brand-red/20 bg-white p-6">
                <XCircle className="h-7 w-7 text-brand-red" />
                <h3 className="mt-3 font-serif text-lg font-bold text-brand-navy">
                  Nu-ți promitem mii de vizitatori
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Un articol de presă aduce notorietate, nu trafic — la fel și la
                  publicațiile care cer 4.500 de lei. Îl promovăm 3 zile pe
                  Facebook, pe ziarul ales de tine, dar nu promitem cifre. Dacă
                  ce cauți sunt vizitatori pe site-ul tău, ai nevoie de o
                  campanie de reclamă, și ți-o spunem din start.
                </p>
              </div>
              {/*
                Al treilea refuz, cel care conteaza juridic: ne obligam sa
                publicam, nu sa producem vanzari. Aceeasi formulare e in
                termeni, ca sa nu existe diferenta intre ce citeste omul aici
                si ce semneaza la comanda.
              */}
              <div className="rounded-2xl border-2 border-brand-red/20 bg-white p-6 md:col-span-2">
                <XCircle className="h-7 w-7 text-brand-red" />
                <h3 className="mt-3 font-serif text-lg font-bold text-brand-navy">
                  Nu-ți promitem clienți, vânzări sau cereri de ofertă
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Ne obligăm să publicăm articolul în cele 50 de publicații și
                  să-ți dăm lista cu toate linkurile — atât. Ce faci mai departe
                  cu aparițiile, cât de bun e textul și cât de căutat e ce vinzi
                  nu depind de noi. Nu promitem nici poziții în Google, nici
                  creșterea vreunui indicator SEO, nici un anumit număr de
                  afișări pe Facebook. Toate limitele sunt scrise pe larg în{" "}
                  <Link href="/legal/termeni" className="font-semibold text-brand-red hover:underline">
                    termeni și condiții
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-brand-navy p-6 text-center md:p-8">
              <p className="font-serif text-xl font-bold text-white">
                Ce îți promitem, în schimb:
              </p>
              <p className="mx-auto mt-2 max-w-lg text-sm text-white/75">
                50 de publicații, în maximum 12 ore lucrătoare. Rămân permanent.
                Primești lista cu toate linkurile. Dacă nu publicăm la timp,
                primești banii înapoi.
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

      {/*
        Dovada sociala, dupa ce omul a vazut produsul si conditiile.
        06.09.2026 — ramane UN singur testimonial (proprietarul: „mai punem
        tot unul"). Un citat anonim in plus n-ar adauga nimic; ce cantareste
        aici e ca omul care l-a scris a publicat 46 de articole in retea,
        adica s-a intors de 46 de ori. Asta spune incadrarea, ca cititorul sa
        nu vada „doar unul", ci „unul care a ramas".
      */}
      <section className="section">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Ce spun clienții</p>
            <h2 className="h2 mt-2">Un client care s-a întors de 46 de ori</h2>
          </div>
          <div className="mt-10">
            <ClientTestimonials />
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

      {/*
        06.09.2026 — caseta cu IBAN-ul si beneficiarul a fost SCOASA de aici
        (proprietarul: „este pe traseul comenzii"). Datele de plata apar oricum
        pe /comanda/transfer, unde omul chiar plateste; pe pagina de vanzare
        ocupau un ecran intreg cu ceva ce nu vinde si ce nu-i trebuie inca.
        Faptul ca se poate plati prin OP e spus in oferta si in intrebari.
      */}

      {/* Intrebari frecvente */}
      <section id="intrebari" className="scroll-mt-20 section bg-slate-50">
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
            50 de ziare. 12 ore lucrătoare. 500 de lei.
          </h2>
          <p className="lead mx-auto mt-4 max-w-2xl text-white/85">
            Ofertă limitată pentru clienți noi. Comanzi acum, trimiți articolul,
            iar în 12 ore lucrătoare ai lista cu toate cele 50 de linkuri.
          </p>
          <div className="mt-8">
            <PromoOffer showPrice={false} />
          </div>
          {/*
            Cine incaseaza cei 500 de lei, chiar sub ultimul buton. Un vizitator
            a cautat datele firmei pe site si nu le-a gasit — inainte de plata e
            exact momentul in care omul vrea sa verifice cu cine are de-a face.
          */}
          <div className="mx-auto mt-10 max-w-md text-left">
            <DateFirma dark />
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
