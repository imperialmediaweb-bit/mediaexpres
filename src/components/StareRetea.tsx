import { CheckCircle2, ExternalLink, Facebook } from "lucide-react";
import { stareRetea, acum } from "@/lib/stare-retea";

/*
  „Sunt ziare adevarate?" — raspunsul live. Cate ziare au publicat in
  ultimele 24 de ore, cate articole, si lista lor, cu ultimul articol si
  linkul. Datele vin din platforma de publicare (lib/stare-retea.ts); cand
  nu raspunde, componenta nu randeaza nimic.

  `compact`: pe oferta, lista sta intr-un <details> — pagina e deja lunga;
  pe /reteaua-noastra e desfasurata.
*/

export async function StareRetea({ compact = false }: { compact?: boolean }) {
  const s = await stareRetea();
  if (!s) return null;
  const fata = new Date();
  const ora = new Date(s.actualizatLa).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bucharest",
  });

  const lista = (
    <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {s.ziare.map((z) => (
        <li
          key={z.slug}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <div className="min-w-0">
            <a
              href={z.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-navy hover:text-brand-red"
            >
              {z.nume}
            </a>
            <div className="text-xs text-slate-500">
              {z.articole_24h} {z.articole_24h === 1 ? "articol" : "articole"} în 24 h · ultimul {acum(z.ultimul_articol, fata)}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {z.facebook && (
              <a
                href={z.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Pagina de Facebook ${z.nume}`}
                className="text-slate-400 hover:text-[#1877F2]"
              >
                <Facebook className="h-4 w-4" />
              </a>
            )}
            <a
              href={z.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Deschide ${z.nume}`}
              className="text-slate-400 hover:text-brand-red"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      id="stare-retea"
      className="mx-auto mt-8 max-w-5xl scroll-mt-24 rounded-2xl border border-green-200 bg-green-50/40 p-6 md:p-8"
      data-testid="stare-retea"
    >
      <p className="text-center text-xs font-bold uppercase tracking-wider text-green-700">
        Live, din platforma de publicare · actualizat la {ora}
      </p>
      <h3 className="mt-2 text-center font-serif text-2xl font-bold text-brand-navy">
        {s.ziareCarePublica} din {s.ziareTotal} publicații au publicat în ultimele 24 de ore
      </h3>
      <p className="mt-2 text-center text-slate-700">
        <strong>{s.articole24h.toLocaleString("ro-RO")}</strong> articole noi, din care{" "}
        <strong>{s.locale24h.toLocaleString("ro-RO")}</strong> știri locale. Deschide oricare ziar și vezi
        ce a apărut azi.
      </p>

      {compact ? (
        <details className="group mt-4">
          <summary className="cursor-pointer list-none text-center text-sm font-semibold text-brand-red hover:underline">
            Vezi fiecare ziar, cu ultimul articol publicat →
          </summary>
          {lista}
        </details>
      ) : (
        lista
      )}

      {/*
        De ce nu e o „retea de linkuri": doar fapte verificabile, fara
        aparare. Un PBN se ascunde (WHOIS privat, IP-uri diferite,
        proprietar necunoscut); noi publicam cifrele.
      */}
      {/*
        25.09.2026 — pe telefon, bula „Ai o întrebare?" stătea fix peste
        rândul „Advertorialele sunt sub 2% din articole", adică peste singurul
        argument pentru care există caseta asta. Aceeași regulă ca la butonul
        de comandă și la preț (hooks/useZonaLibera): cât timp caseta e pe
        ecran, elementele plutitoare se dau la o parte.
      */}
      <div data-nu-acoperi="1" className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <p className="font-serif text-lg font-bold text-brand-navy">De ce nu e o „rețea de linkuri”</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>
              <strong>Proprietarul e public.</strong> Aceeași firmă, scrisă în subsolul fiecărui ziar și al acestui site, cu CUI. O rețea de linkuri se ascunde; noi publicăm cifrele, live.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>
              <strong>Fiecare ziar scrie zilnic despre județul lui</strong>: primărie, spital, școli, sport, accidente. Sute de articole pe zi în rețea, indiferent dacă are sau nu clienți.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>
              <strong>Ziarele nu se leagă între ele.</strong> Linkurile interne rămân în interiorul aceluiași ziar. Nicio publicație nu există ca să trimită linkuri spre alta.
            </span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <span>
              <strong>Advertorialele sunt sub 2% din articole.</strong> Restul e presă. Articolul tău apare între știri reale, pe o pagină cu audiență reală, distribuită pe Facebook.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
