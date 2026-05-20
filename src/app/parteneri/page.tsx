import type { Metadata } from "next";
import {
  Handshake,
  Percent,
  FileText,
  Receipt,
  Layout,
  Zap,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { ApplicationForm } from "./ApplicationForm";

export const metadata: Metadata = {
  title: "Program de parteneri reseller - MediaExpres",
  description:
    "Agentii PR si freelanceri: revindeti reteaua MediaExpres clientilor vostri cu discount -25% pana la -35% si raport white-label.",
};

export default function ParteneriPage() {
  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="container py-16 md:py-24">
          <p className="eyebrow text-brand-gold">Program reseller</p>
          <h1 className="h1 mt-3 text-white max-w-3xl">
            Revindeti reteaua MediaExpres clientilor vostri
          </h1>
          <p className="lead mt-4 max-w-3xl text-white/85">
            Sunteti agentie PR, freelancer in comunicare sau studio de marketing?
            Folositi reteaua noastra de 50 ziare romanesti ca distributie out-of-the-box
            pentru clientii vostri, cu discount automat și raport white-label.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#aplica"
              className="inline-flex items-center gap-2 rounded-md bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-navy hover:bg-brand-gold/90"
            >
              Aplica pentru cont reseller →
            </a>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-md border border-white/30 px-6 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Vezi pricing
            </a>
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container max-w-4xl">
          <p className="eyebrow">Cum functioneaza</p>
          <h2 className="h2 mt-2">Pay-per-use cu discount progresiv. Zero risc.</h2>
          <p className="lead mt-4 text-slate-600">
            Nu cumparati pachete in avans. Comandati cand aveti clienti, primiti factura
            consolidata la sfarsitul lunii, cu discount mai mare daca ati comandat mai mult.
          </p>

          <div className="mt-10 space-y-6">
            <Step
              n={1}
              title="Aplicati pentru cont reseller"
              desc="Formularul de mai jos: nume agentie + CUI + email + estimare lunara. Va raspundem in 24h cu termenii."
            />
            <Step
              n={2}
              title="Primiti cont admin cu preturi -25%"
              desc="Toate pachetele apar in contul vostru cu pret partener: National 50 = 1125 RON (vs 1500 retail). Comandati cand vreti, pentru oricare client al vostru."
            />
            <Step
              n={3}
              title="Comandati pentru fiecare client"
              desc="AI scrie articolul din tematica voastra + 3 poze. Publicam pe 50 ziare. In 12h primiti raport PDF cu sigla agentiei (white-label) - clientul vostru nu stie ca subcontractati."
            />
            <Step
              n={4}
              title="Factura consolidata la final de luna"
              desc="Un singur invoice pe luna pentru toti clientii vostri. Daca ati comandat mult, bonusul de volum se aplica automat retroactiv."
            />
          </div>
        </div>
      </section>

      <section id="pricing" className="section bg-slate-50">
        <div className="container max-w-5xl">
          <p className="eyebrow">Discount progresiv</p>
          <h2 className="h2 mt-2">Cu cat publicati mai mult, cu atat platiti mai putin</h2>
          <p className="lead mt-3 text-slate-600">
            Bonusul se calculeaza automat la final de luna si se aplica retroactiv
            pe TOATE articolele lunii (nu doar pe cele peste prag).
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <TierCard
              tier="Bronze"
              volume="1-3 articole/luna"
              discount="-25%"
              pricePerNational="1125 RON"
              note="Pret partener default"
            />
            <TierCard
              tier="Silver"
              volume="4-10 articole/luna"
              discount="-30%"
              pricePerNational="1050 RON"
              note="Bonus volum mediu"
              featured
            />
            <TierCard
              tier="Gold"
              volume="11+ articole/luna"
              discount="-35%"
              pricePerNational="975 RON"
              note="Bonus volum mare"
            />
          </div>

          <div className="mt-10 rounded-xl border border-brand-gold/30 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-6 w-6 shrink-0 text-brand-red" />
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-navy">
                  Optional: abonament Reseller Gold
                </h3>
                <p className="mt-1 text-sm text-slate-700">
                  Daca aveti volum stabil de 6+ articole/luna și vreti predictibilitate,
                  abonamentul Reseller Gold = -32% garantat pe orice pachet + prioritate
                  publicare (raport in 8h in loc de 12h). Detalii dupa aprobare cont.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <p className="eyebrow">Avantaje exclusive reseller</p>
          <h2 className="h2 mt-2">Ce primiti dincolo de discount</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Benefit
              icon={Layout}
              title="Raport PDF white-label"
              desc="Raportul livrat clientului are sigla agentiei voastre, nu MediaExpres. Clientul vede agentia ca furnizor unic."
            />
            <Benefit
              icon={Receipt}
              title="Factura consolidata lunar"
              desc="Un singur invoice pe luna pentru toti clientii vostri. Mai usor de gestionat decat 10 facturi separate."
            />
            <Benefit
              icon={Zap}
              title="Prioritate la publicare"
              desc="Articolele reseller intra in coada prioritara. Raport in 12h garantat (8h cu abonament)."
            />
            <Benefit
              icon={Percent}
              title="Pret partener afisat in cont"
              desc="Logati in admin si vedeti direct preturile cu -25%. Fara sa ne intrebati de fiecare data."
            />
            <Benefit
              icon={FileText}
              title="AI scrie articolul"
              desc="Voi dati 1-2 propozitii de tematica + 3 poze. AI scrie articolul jurnalistic. Voi reviewuiti, noi publicam."
            />
            <Benefit
              icon={Handshake}
              title="Cont admin dedicat"
              desc="Vedeti live status-ul fiecarui articol (publicare, raport, factura). Fara email back-and-forth."
            />
          </div>
        </div>
      </section>

      <section className="section bg-brand-navy text-white">
        <div className="container max-w-4xl">
          <p className="eyebrow text-brand-gold">Inclus in contul de partener</p>
          <h2 className="h2 mt-2 text-white">
            Strateg Editorial AI — planul de continut al fiecarui client
          </h2>
          <p className="lead mt-4 text-white/85">
            Pentru fiecare client al vostru, AI-ul genereaza un calendar editorial cu
            12 idei de articole pe an, adaptate industriei lui. Nu mai inventati teme —
            aveti deja planul de continut pe 12 luni, iar AI scrie comunicatul din
            fiecare tema. Voi reviewuiti, noi publicam pe 50 de ziare.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-5">
              <CheckCircle2 className="h-6 w-6 text-brand-gold" />
              <p className="mt-2 font-serif font-bold text-white">12 teme/an per client</p>
              <p className="mt-1 text-sm text-white/70">
                cu unghiul de comunicare deja definit
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-5">
              <CheckCircle2 className="h-6 w-6 text-brand-gold" />
              <p className="mt-2 font-serif font-bold text-white">AI scrie comunicatul</p>
              <p className="mt-1 text-sm text-white/70">
                din tema aleasa — voi doar aprobati
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-5">
              <CheckCircle2 className="h-6 w-6 text-brand-gold" />
              <p className="mt-2 font-serif font-bold text-white">Distributie pe 50 ziare</p>
              <p className="mt-1 text-sm text-white/70">
                fiecare articol, cu raport PDF in 24h
              </p>
            </div>
          </div>

          <div className="mt-8">
            <a
              href="#aplica"
              className="inline-flex items-center gap-2 rounded-md bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-navy hover:bg-brand-gold/90"
            >
              Vreau acces la Strateg Editorial AI →
            </a>
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="container max-w-3xl">
          <p className="eyebrow">FAQ</p>
          <h2 className="h2 mt-2">Intrebari frecvente</h2>

          <div className="mt-8 space-y-5">
            <Faq
              q="Cine se califica pentru cont reseller?"
              a="Agentii PR / comunicare / marketing cu CUI activ. Freelanceri in comunicare cu portofoliu (minim 2-3 clienti). Studio-uri de marketing care fac PR pentru clientii lor. Nu acceptam clienti directi care vor pretul reseller pentru ei insisi."
            />
            <Faq
              q="Cat dureaza aprobarea?"
              a="Maxim 24h lucratoare. Va contactam pe email cu fie aprobare directa + credentiale cont, fie cu 1-2 intrebari clarificatoare daca aplicatia e incompleta."
            />
            <Faq
              q="E vreun cost de inscriere?"
              a="Nu. Contul reseller e gratuit. Platiti doar articolele pe care le publicati efectiv, cu pret partener."
            />
            <Faq
              q="Pot trece de la pay-per-use la abonament?"
              a="Da, oricand. Daca dupa 2-3 luni vedeti ca aveti volum stabil, puteti trece pe abonament Reseller Gold pentru -32% garantat. Daca volumul scade, reveniti la pay-per-use."
            />
            <Faq
              q="Cum aplica bonusul de volum?"
              a="La final de luna, calculam automat cate articole ati publicat. Daca ati depasit 4 sau 11 articole, bonusul (-30% sau -35%) se aplica retroactiv pe TOATE articolele lunii. Factura finala arata pretul corectat."
            />
            <Faq
              q="Cine factureaza catre clientul meu final?"
              a="Voi. Voi pastrati relatia comerciala cu clientul si emiteti factura voastra catre el la pretul vostru. Noi va facturam doar pe voi (cu pret partener), un invoice consolidat lunar."
            />
          </div>
        </div>
      </section>

      <section id="aplica" className="section bg-white">
        <div className="container max-w-3xl">
          <p className="eyebrow">Aplicare</p>
          <h2 className="h2 mt-2">Aplicati pentru cont reseller</h2>
          <p className="lead mt-3 text-slate-600">
            Completati formularul de mai jos. Va raspundem in 24h lucratoare cu fie
            aprobarea + credentialele de cont, fie cu intrebari clarificatoare.
          </p>

          <div className="mt-8">
            <ApplicationForm />
          </div>
        </div>
      </section>
    </>
  );
}

function Step({
  n,
  title,
  desc,
}: {
  n: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-red font-serif text-lg font-bold text-white">
        {n}
      </div>
      <div>
        <h3 className="font-serif text-lg font-bold text-brand-navy">{title}</h3>
        <p className="mt-1 text-slate-600">{desc}</p>
      </div>
    </div>
  );
}

function TierCard({
  tier,
  volume,
  discount,
  pricePerNational,
  note,
  featured,
}: {
  tier: string;
  volume: string;
  discount: string;
  pricePerNational: string;
  note: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-6 ${
        featured
          ? "border-brand-red shadow-lg"
          : "border-slate-200"
      }`}
    >
      {featured && (
        <span className="inline-block rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-white">
          Cel mai comun
        </span>
      )}
      <h3 className="mt-3 font-serif text-2xl font-bold text-brand-navy">
        {tier}
      </h3>
      <p className="text-sm text-slate-500">{volume}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-serif text-4xl font-bold text-brand-red">
          {discount}
        </span>
        <span className="text-sm text-slate-500">rate-card</span>
      </div>
      <p className="mt-3 text-sm text-slate-700">
        Ex: National 50 ={" "}
        <strong className="text-brand-navy">{pricePerNational}</strong>
        {" "}(vs 1500 retail)
      </p>
      <p className="mt-3 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function Benefit({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <Icon className="h-7 w-7 text-brand-red" />
      <h3 className="mt-3 font-serif text-lg font-bold text-brand-navy">
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer font-serif text-base font-bold text-brand-navy">
        <CheckCircle2 className="inline h-4 w-4 text-brand-red mr-2" />
        {q}
      </summary>
      <p className="mt-3 text-sm text-slate-600">{a}</p>
    </details>
  );
}
