import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Facebook, FileText, ShieldCheck, XCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StareRetea } from "@/components/StareRetea";
import { cifreLive } from "@/lib/cifre-live";
import { nr, milioane } from "@/data/cifre";

/*
  22.09.2026 — pagina cerută de proprietar: „undeva să spui de ce nu e o
  rețea de linkuri, cu starea, traficul, paginile de Facebook".

  E cea mai scumpă obiecție pe care o are. Un prospect a refuzat pachetul
  de 500 spunând „îs doar 30 de ziare, făcute toate cu AI". Clientul de SEO
  a spus-o pe față: „la prețul ăsta e o rețea de bloguri private și nu vreau
  să riscăm ban". Amândoi au plecat cu îndoiala, nu cu un răspuns.

  Cum e construită pagina, și de ce așa:

  - Nu repetă acuzația în titlu și nici în adresă. „De ce nu suntem o rețea
    de linkuri" ar lega domeniul de exact expresia de care fugim, în Google
    și în capul omului. Pagina se cheamă „Transparență" și răspunde prin
    fapte, nu prin negare.
  - Cifrele vin LIVE din rețea (cifreLive), cu data lângă ele. O cifră
    adevărată azi devine minciună peste trei luni, iar pagina rămâne online.
  - Starea rețelei, live, în mijlocul paginii: nu spui că se publică zilnic,
    arăți articolele de azi, pe fiecare ziar.
  - NU se pun aici cititorii unici pe site și nici urmăritorii pe fiecare
    pagină de Facebook (decizia proprietarului). Totalul agregat e deja
    public pe ofertă, deci rămâne și aici.
  - Nu se promit poziții în Google. Nicăieri.
*/

export const metadata: Metadata = {
  title: "Transparență — cifrele rețelei MediaExpres",
  description:
    "Câte publicații, câte articole pe zi, câte pagini de Facebook și ce parte din conținut e publicitate. Cifrele rețelei MediaExpres, verificabile una câte una.",
};

// Aceeași frecvență ca pe ofertă: cifrele se reîmprospătează din oră în oră.
export const revalidate = 3600;

export default async function TransparentaPage() {
  const c = await cifreLive();

  const FAPTE = [
    {
      icon: Newspaper,
      titlu: `${c.publicatii} de publicații, fiecare cu redacția ei`,
      text: `41 de ziare județene, câte unul pentru fiecare județ, plus 9 publicații naționale. Fiecare are propriul domeniu, propria pagină de Facebook și propriul flux de știri locale. Nu sunt subdomenii ale aceluiași site.`,
    },
    {
      icon: FileText,
      titlu: `${nr(c.articolePeZi)} de articole publicate în fiecare zi`,
      text: `${nr(c.articolePeLuna)} de articole în ultimele 30 de zile, ${milioane(
        c.articoleInArhiva,
      )} în arhivă. Știri locale: primărie, poliție, școli, spitale, sport, evenimente. Deschide orice ziar din listă și citește ce a apărut azi.`,
    },
    {
      icon: Facebook,
      titlu: `${c.paginiFacebook} de pagini de Facebook, cu ${nr(c.urmaritoriFacebook)} de urmăritori`,
      text: `Fiecare publicație își postează articolele pe pagina ei, în fiecare zi. Paginile au fost construite în ani, cu oameni din județele respective. Sunt publice — intră pe oricare și uită-te la istoricul postărilor.`,
    },
    {
      icon: ShieldCheck,
      titlu: "Advertorialele sunt sub 2% din ce publicăm",
      text: `Un ziar din rețea scoate în jur de 360 de articole pe lună. Dintre ele, 3-5 sunt plătite. Restul e redacție. Ăsta e raportul care face diferența între o publicație care acceptă publicitate și un site făcut pentru publicitate.`,
    },
  ];

  const NU_FACEM = [
    "Nu ne pasăm linkuri între ziarele proprii ca să ne creștem unul pe altul.",
    "Nu publicăm articole scrise doar ca să găzduiască un link.",
    "Nu vindem linkuri separat de articol.",
    "Nu promitem poziții în Google — nimănui, niciodată.",
    "Nu acceptăm conținut medical care promite vindecări, și nici text care nu trece de regulile noastre de conținut.",
  ];

  return (
    <>
      <section className="bg-brand-navy py-16 text-white md:py-24">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
              Transparență
            </p>
            <h1 className="mt-3 font-serif text-4xl font-bold md:text-5xl">
              Cifrele rețelei, una câte una
            </h1>
            <p className="mt-5 text-lg text-white/80">
              Întrebarea pe care ne-o pune aproape fiecare client înainte să cumpere: sunt
              ziare adevărate sau site-uri făcute pentru reclame? Mai jos e răspunsul, în
              cifre pe care le poți verifica singur, fără să ne crezi pe cuvânt.
            </p>
            <p className="mt-4 text-sm text-white/50">
              Cifrele sunt din {c.laData}
              {c.sursa === "live" ? ", citite direct din platforma de publicare" : ""}.
            </p>
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            {FAPTE.map((f) => (
              <div key={f.titlu} className="rounded-2xl border border-slate-200 p-6">
                <f.icon className="h-8 w-8 text-brand-red" />
                <h2 className="mt-4 font-serif text-xl font-bold text-brand-navy">
                  {f.titlu}
                </h2>
                <p className="mt-2 text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nu spui că se publică zilnic. Arăți articolele de azi. */}
      <section className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Acum, în timp real</p>
            <h2 className="h2 mt-2">Ce s-a publicat astăzi</h2>
            <p className="lead mt-4">
              Lista de mai jos se actualizează singură. Fiecare ziar, cu articolele din
              ultimele 24 de ore și cu ultimul publicat.
            </p>
          </div>
          <div className="mt-10">
            <StareRetea />
          </div>
        </div>
      </section>

      {/*
        22.09.2026 — pentru clientul de SEO, asta e dovada cea mai grea: cine
        vinde linkuri le scoate pe toate intr-o zi, ca sa incaseze si sa treaca
        mai departe. Esalonarea pe saptamani costa timp si nu aduce niciun ban
        in plus — se face doar pentru ca asa e bine pentru client.
      */}
      <section className="section bg-white">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Ritmul publicării</p>
            <h2 className="h2 mt-2">Alegi în cât timp apar cele 50 de articole</h2>
            <p className="lead mt-4">
              Cincizeci de articole apărute în aceeași zi se citesc, pentru oricine se
              uită, ca o singură achiziție. De-aia poți cere să fie întinse în timp — nu
              costă nimic în plus și nu ne aduce nouă nimic; e doar mai bine pentru tine.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-3">
            {[
              {
                t: "12 ore lucrătoare",
                p: "Când ai un eveniment, o lansare sau un comunicat care trebuie să iasă acum.",
              },
              {
                t: "Întins pe 3 zile",
                p: "Advertorial obișnuit. Arată ca un flux normal de presă și dă timp fiecărui articol să fie indexat.",
              },
              {
                t: "Întins pe 2 săptămâni",
                p: "Dacă scopul e SEO și linkuri. Apar câteva pe zi, ca plasările obișnuite dintr-o redacție.",
              },
            ].map((v) => (
              <div key={v.t} className="rounded-2xl border border-slate-200 p-6">
                <p className="font-serif text-lg font-bold text-brand-navy">{v.t}</p>
                <p className="mt-2 text-sm text-slate-600">{v.p}</p>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-slate-500">
            Tot pentru SEO: textul linkurilor se poate schimba de la un ziar la altul, ca
            aceeași expresie să nu apară de cincizeci de ori.{" "}
            <Link href="/ritm-publicare" className="font-semibold text-brand-red hover:underline">
              Detalii despre fiecare variantă →
            </Link>
          </p>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="h2 text-center">Ce nu facem</h2>
            <p className="lead mt-4 text-center">
              Regulile astea ne costă clienți. Le ținem oricum, pentru că fără ele
              publicațiile noastre ar ajunge exact ce ni se reproșează.
            </p>
            <ul className="mt-8 space-y-3">
              {NU_FACEM.map((r) => (
                <li key={r} className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
                  <span className="text-slate-700">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="h2 text-center">Cum verifici, în cinci minute</h2>
            <ul className="mt-8 space-y-3">
              {[
                "Deschide lista publicațiilor și intră pe trei la întâmplare. Uită-te la ce s-a publicat azi și ieri.",
                "Caută pe fiecare pagina de Facebook și vezi de când postează și ce postează.",
                "Deschide un raport de client și citește două articole din ziare diferite — o să vezi că textul e altul pe fiecare.",
                "Uită-te la data articolelor din arhivă. Un site făcut pentru linkuri nu are doi ani de știri locale în spate.",
              ].map((r) => (
                <li key={r} className="flex items-start gap-3 rounded-xl bg-white p-4">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
                  <span className="text-slate-700">{r}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="accent" size="lg">
                <Link href="/reteaua-noastra">Vezi cele 50 de publicații →</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/exemple">Rapoarte și articole reale</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand-navy py-14 text-white">
        <div className="container text-center">
          <h2 className="font-serif text-2xl font-bold md:text-3xl">
            Articolul tău, în {c.publicatii} de publicații
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/75">
            500 de lei, o singură plată. Text unic pe fiecare ziar, raport cu toate
            linkurile, articolele rămân online permanent.
          </p>
          <div className="mt-7">
            <Button asChild variant="accent" size="lg">
              <Link href="/oferta-500">Vezi oferta →</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
