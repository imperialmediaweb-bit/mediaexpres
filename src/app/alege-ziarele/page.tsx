import type { Metadata } from "next";
import Link from "next/link";
import { AlegeZiare } from "./AlegeZiare";
import { TOTAL_ZIARE, PRET_RETEA, pretBucata } from "@/lib/alacarte";
import { parteneriDisponibili, reduceriVolum, type PartenerCatalog } from "@/lib/catalog-parteneri";

// Catalogul partenerilor se citeste din baza la fiecare vizita: un partener
// aprobat azi trebuie sa apara azi, nu la urmatorul deploy.
export const dynamic = "force-dynamic";

/*
  23.09.2026 — cerută de proprietar: „vreau pe MediaExpres o pagină cu ziarele,
  să aleagă singur. Să bifeze un ziar sau mai multe și să cumpere. Dacă vrea
  doar pe un oraș, sau o publicație, să aleagă doar aia."

  Ce lipsea: alegerea exista în pachete („Local — 1 ziar la alegere"),
  dar se făcea DUPĂ plată, pe WhatsApp. Omul care voia doar Clujul n-avea unde
  să apese; trebuia să plătească pe încredere și abia apoi să spună unde.

  Prețul e calculat pe server din publicațiile bifate (lib/alacarte.ts), nu din
  ce trimite browserul, și e PLAFONAT la prețul întregii rețele — altfel pagina
  ar fi cerut 900 de lei pentru 9 ziare când 50 costă 500, adică exact
  contradicția de preț care a plecat deja un client.
*/

export const metadata: Metadata = {
  title: `Alege singur ziarele — de la ${pretBucata(1)} lei`,
  description: `Bifează publicațiile în care vrei să apară articolul tău: unul singur, un județ, o regiune sau toate ${TOTAL_ZIARE}. Plătești exact cât ai bifat, maximum ${PRET_RETEA} de lei.`,
  alternates: { canonical: "/alege-ziarele" },
};

export default async function AlegeZiarelePage() {
  // Daca baza nu raspunde, pagina merge mai departe cu ziarele retelei.
  let parteneri: PartenerCatalog[] = [];
  try {
    parteneri = await parteneriDisponibili();
  } catch (e) {
    console.error("[alege-ziarele] parteneri:", e);
  }
  return (
    <>
      <section className="bg-brand-navy py-14 text-white md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow text-brand-gold">La alegerea ta</p>
            <h1 className="mt-3 font-serif text-4xl font-bold md:text-5xl">
              Alege ziarele în care apari
            </h1>
            <p className="mt-5 text-lg text-white/80">
              Ai nevoie doar de orașul tău? Bifează o singură publicație și plătești doar
              atât. Vrei o regiune întreagă sau toată țara? Bifează cât vrei — prețul pe
              publicație scade, iar mai mult de {PRET_RETEA} de lei nu plătești niciodată,
              nici dacă le iei pe toate {TOTAL_ZIARE}.
            </p>
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <div className="mx-auto mb-10 grid max-w-5xl gap-4 sm:grid-cols-3">
            {[
              {
                t: `${pretBucata(1)} lei`,
                p: "o singură publicație — județul tău, atât",
              },
              {
                t: `${pretBucata(3)} lei bucata`,
                p: "de la 3 publicații în sus",
              },
              {
                t: `${PRET_RETEA} lei`,
                p: `toate cele ${TOTAL_ZIARE} — prețul nu urcă peste atât`,
              },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-slate-200 p-5 text-center">
                <p className="font-serif text-2xl font-bold text-brand-navy">{c.t}</p>
                <p className="mt-1 text-sm text-slate-600">{c.p}</p>
              </div>
            ))}
          </div>

          <AlegeZiare parteneri={parteneri} reduceri={reduceriVolum()} />
        </div>
      </section>

      {/*
        29.09.2026 — ce ne deosebeste de pietele de linkuri: paza linkurilor la
        partenerii din catalog (lib/paza-linkuri.ts). Apare doar cand exista
        parteneri de cumparat. Fara comparatii cu altii si fara „garantat
        indexat": promitem doar ce verificam noi.
      */}
      {parteneri.length > 0 && (
        <section className="section bg-white">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <p className="eyebrow text-center">La publicațiile partenere și influenceri</p>
              <h2 className="h2 mt-2 text-center">Linkurile tale, păzite 12 luni</h2>
              <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
                Nu vindem „un articol publicat”. Vindem un articol care rămâne online, cu linkul tău întreg,
                un an întreg — și verificăm asta noi, nu tu.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    t: "🛡 Verificat în fiecare săptămână",
                    p: "Automat: pagina e online, linkul către site-ul tău e acolo, e dofollow și nimic nu o ascunde de Google.",
                  },
                  {
                    t: "⏱ Stricat? 3 zile să repare",
                    p: "Dacă ceva nu mai e în regulă, publicația are 3 zile să repare. Până atunci nu o plătim.",
                  },
                  {
                    t: "↩ Nereparat? Te despăgubim",
                    p: "Mutăm articolul pe altă publicație sau îți returnăm banii pentru ea. Tu nu alergi după nimeni.",
                  },
                  {
                    t: "👁 Vezi tot, oricând",
                    p: "Pe pagina comenzii tale: unde a apărut fiecare articol și „verificat automat pe…”, cu data.",
                  },
                  {
                    t: "💬 Discuți prin noi",
                    p: "Întrebări sau modificări? Scrii publicației direct din pagina comenzii — noi vedem tot și intervenim.",
                  },
                  {
                    t: "✍️ Articolul îl scriem noi",
                    p: "Comunicat, advertorial sau articol SEO, cu linkurile puse exact pe cuvintele alese de tine.",
                  },
                ].map((c) => (
                  <div key={c.t} className="rounded-2xl border border-slate-200 p-5">
                    <p className="font-semibold text-brand-navy">{c.t}</p>
                    <p className="mt-1 text-sm text-slate-600">{c.p}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-center text-xs text-slate-500">
                Verificăm că pagina poate fi găsită de Google; dacă și când o indexează, decide Google.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="section bg-slate-50 pb-32">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="h2 text-center">Ce primești, indiferent câte alegi</h2>
            <ul className="mt-8 space-y-3">
              {[
                "Articol scris în variantă proprie pe fiecare publicație — nu același text copiat.",
                "Postare pe pagina de Facebook a fiecărei publicații alese.",
                "Raport cu toate linkurile, pe email.",
                "Articolele rămân online permanent, fără abonament.",
                "Publicare în maximum 12 ore lucrătoare de la primirea materialului.",
              ].map((r) => (
                <li key={r} className="rounded-xl bg-white p-4 text-slate-700">
                  {r}
                </li>
              ))}
            </ul>

            <p className="mt-8 text-center text-sm text-slate-500">
              Cazinouri, pariuri și păcănele au tarif separat —{" "}
              <Link href="/contact" className="font-semibold text-brand-red hover:underline">
                scrie-ne
              </Link>
              . Nu ești sigur ce publicații ți se potrivesc?{" "}
              <Link
                href="/reteaua-noastra"
                className="font-semibold text-brand-red hover:underline"
              >
                Vezi rețeaua întreagă
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
