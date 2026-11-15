import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Landmark, MessageCircle, FileText, Image as ImageIcon, Link2, Clock, Shuffle, Receipt, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/data/site";

/*
  15.11.2026 — ghidul de comanda, cerut de proprietar: clientii de pe WhatsApp
  intreaba „ai un how to pe site?". Clipul si capturile sunt facute pe site-ul
  real, cu date de proba (fara nicio comanda trimisa). Pozele: public/ghid/.
*/

export const metadata: Metadata = {
  title: "Cum comanzi articolul în 50 de ziare, pas cu pas | MediaExpres",
  description:
    "Ghid pas cu pas: ce trimiți (articol, poze, linkuri), cum plătești (card, ordin de plată sau WhatsApp) și cum urmărești publicarea în timp real.",
  alternates: { canonical: "/cum-comanzi" },
};

const RAPORT_EXEMPLU = "/raport/-_8BkF1L410hb2oFATe9uA4n06SppLAz";

const NEVOIE = [
  { icon: FileText, t: "Articolul", d: "În Word (cu linkurile puse pe cuvinte) sau ca text. Ideal 400–800 de cuvinte. N-ai articol? Ne dai site-ul și ce vrei să promovezi, îl scriem noi și ți-l arătăm înainte de publicare." },
  { icon: ImageIcon, t: "Până la 3 poze", d: "Prima e poza principală, reprezentativă. Celelalte două apar în articol. JPG sau PNG, pe orizontală, ideal 1200 × 800 px." },
  { icon: Link2, t: "Până la 3 linkuri", d: "Cuvântul și adresa pe care să ducă. Linkurile sunt dofollow și rămân permanent." },
  { icon: Shuffle, t: "Text unic sau identic", d: "Același text în toate ziarele sau rescris pe fiecare ziar, cu același mesaj și aceleași linkuri (recomandat pentru Google)." },
  { icon: Clock, t: "În cât timp apar", d: "Toate în 12 ore lucrătoare, eșalonat pe 3 zile sau pe 2 săptămâni." },
  { icon: Receipt, t: "Datele firmei", d: "Scrii CUI-ul și numele și adresa vin singure de la ANAF. Factura vine pe email." },
];

const PASI = [
  ["Intră pe oferta de 500 lei", "Pe mediaexpress.ro/oferta-500 apeși „Comandă acum — 500 lei”."],
  ["Emailul și telefonul", "Pe email primești factura și raportul cu toate linkurile."],
  ["Firma, pentru factură", "Scrii CUI-ul și apeși „Caută firma”. Numele și adresa vin de la ANAF."],
  ["Articolul", "Îl ai, îl scriem noi din site-ul tău sau îl trimiți după plată."],
  ["Ai articolul în Word?", "Încarci fișierul .docx: luăm din el textul, pozele și linkurile."],
  ["Sau lipești textul", "Copiezi textul articolului direct în căsuță."],
  ["Linkurile", "Cuvântul și adresa pe care să ducă, până la 3."],
  ["Pozele", "Până la 3. Prima e poza principală."],
  ["În cât timp apar", "12 ore, 3 zile sau 2 săptămâni."],
  ["Text unic pe fiecare ziar", "Același mesaj, formulat diferit pe fiecare ziar."],
  ["Promovare 3 zile pe Facebook", "Alegi ziarul: național sau din județul tău."],
  ["Trimiți comanda", "Bifezi declarația și apeși „Trimite comanda și alege plata”."],
];

export default function CumComanziPage() {
  const wa = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent("Bună ziua! Aș vrea să comand articolul în 50 de ziare (500 lei). Am văzut ghidul de pe site.")}`;
  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="container grid items-center gap-10 py-16 md:grid-cols-2 md:py-20">
          <div>
            <p className="eyebrow text-brand-gold">Ghid pas cu pas</p>
            <h1 className="h1 mt-3 text-white">Cum comanzi articolul în 50 de ziare</h1>
            <p className="lead mt-5 text-white/85">
              Durează câteva minute. Trimiți articolul (sau doar site-ul), plătești cu cardul, prin ordin
              de plată sau ne scrii pe WhatsApp, iar după comandă urmărești publicarea în timp real.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="accent" size="lg">
                <Link href="/oferta-500">Comandă — 500 lei</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/40 bg-transparent text-white hover:bg-white/10">
                <a href={wa} target="_blank" rel="noopener">Comandă pe WhatsApp</a>
              </Button>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[320px]">
            <video
              controls
              playsInline
              preload="metadata"
              poster="/ghid/cum-comanzi-poster-v1.jpg"
              className="w-full rounded-2xl border-4 border-black shadow-2xl"
            >
              <source src="/ghid/cum-comanzi-v1.mp4" type="video/mp4" />
            </video>
            <p className="mt-2 text-center text-xs text-white/60">Clipul complet, cu voce (1:52)</p>
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Înainte să începi</p>
            <h2 className="h2 mt-2">Ce ai nevoie</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {NEVOIE.map(({ icon: I, t, d }) => (
              <div key={t} className="rounded-xl border border-slate-200 bg-white p-5">
                <I className="h-7 w-7 text-brand-red" />
                <h3 className="mt-3 font-serif text-lg font-bold text-brand-navy">{t}</h3>
                <p className="mt-1 text-sm text-slate-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Comanda pe site</p>
            <h2 className="h2 mt-2">Pașii, cu capturi de pe telefon</h2>
          </div>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PASI.map(([t, d], i) => (
              <li key={t} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/ghid/pas-${String(i + 1).padStart(2, "0")}-v1.webp`} alt={`Pasul ${i + 1}: ${t}`} width={540} height={960} loading="lazy" className="w-full" />
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-red">Pasul {i + 1}</p>
                  <h3 className="font-serif text-base font-bold text-brand-navy">{t}</h3>
                  <p className="mt-1 text-sm text-slate-600">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Plata</p>
            <h2 className="h2 mt-2">Trei feluri de a comanda</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Plata icon={CreditCard} titlu="Cu cardul" poza="pas-13" text="Apeși „Plătește 500 lei”, pe pagina securizată Stripe. Factura vine pe email în câteva minute." />
            <Plata icon={Landmark} titlu="Prin ordin de plată" poza="pas-15" text="Apeși „Trimite-mi factura”. Factura vine pe email cu IBAN-ul; la detalii scrii numărul facturii. Publicăm după încasare." />
            <Plata icon={MessageCircle} titlu="Pe WhatsApp" poza="pas-16" text="Ai o întrebare înainte să plătești? Ne scrii pe WhatsApp, trimiți articolul și pozele acolo, iar noi facem restul.">
              <Button asChild variant="accent" className="mt-4 w-full">
                <a href={wa} target="_blank" rel="noopener">Scrie-ne pe WhatsApp</a>
              </Button>
            </Plata>
          </div>
        </div>
      </section>

      <section className="section bg-brand-navy text-white">
        <div className="container max-w-3xl text-center">
          <Activity className="mx-auto h-10 w-10 text-brand-gold" />
          <h2 className="h2 mt-3 text-white">După comandă: raportul în timp real</h2>
          <p className="lead mt-4 text-white/85">
            După ce pornim publicarea, primești pe email un link de raport. Acolo vezi fiecare articol cum
            apare, cu data, ora și linkul lui, iar la final le ai pe toate cele 50. Raportul se descarcă și
            în PDF și Excel și rămâne activ permanent.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="accent" size="lg">
              <a href={RAPORT_EXEMPLU} target="_blank" rel="noopener">Vezi un raport real</a>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/40 bg-transparent text-white hover:bg-white/10">
              <Link href="/reteaua-noastra">Vezi cele 50 de ziare</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container text-center">
          <h2 className="h2">Gata să publici?</h2>
          <p className="lead mx-auto mt-3 max-w-xl">500 lei, preț final, cu factură. Publicare în maximum 12 ore lucrătoare.</p>
          <div className="mt-6">
            <Button asChild variant="accent" size="lg">
              <Link href="/oferta-500">Comandă acum — 500 lei</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Plata({
  icon: I,
  titlu,
  poza,
  text,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titlu: string;
  poza: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/ghid/${poza}-v1.webp`} alt={titlu} width={540} height={960} loading="lazy" className="w-full" />
      <div className="flex flex-1 flex-col p-5">
        <I className="h-7 w-7 text-brand-red" />
        <h3 className="mt-2 font-serif text-xl font-bold text-brand-navy">{titlu}</h3>
        <p className="mt-1 text-sm text-slate-600">{text}</p>
        {children}
      </div>
    </div>
  );
}
