import Link from "next/link";

/*
  Secțiunea „Agențiile lucrează cu noi" (16.10.2026). Proprietarul: agențiile
  din România (white-label) nu se numesc — le-am strica relația cu clienții
  lor. Se numește doar Deep Media (China), care ne-a căutat pentru un brand
  auto internațional. Logo-ul lor e alb, de aceea secțiunea e pe fundal închis.
*/
const TEXT = {
  ro: {
    eyebrow: "Agențiile au încredere",
    titlu: "Agențiile de comunicare lucrează cu noi",
    p1: "De peste un an, agenții de PR și comunicare din România își distribuie prin rețeaua MediaExpres comunicatele pentru clienți foarte mari: branduri internaționale de retail și modă, companii din servicii, imobiliare și industrie.",
    p2: "Agenția ne trimite comunicatul, noi îl publicăm în 50 de ziare online, în toate județele, și îi dăm raportul cu toate linkurile, gata de prezentat clientului.",
    cifre: [
      { v: "1+ an", l: "colaborare cu agenții de PR" },
      { v: "50", l: "ziare, în toate județele" },
      { v: "12 h", l: "de la comunicat la linkuri" },
    ],
    eticheta: "Studiu de caz · internațional",
    caz: "Un grup de marketing din China, cu peste 650 de specialiști și peste 1.000 de clienți, ne-a ales pentru distribuția în România a comunicatului unui brand auto internațional.",
    detalii: ["Brand auto internațional", "50 de ziare", "Traducere din engleză"],
    cta: "Lucrați într-o agenție? Prețuri de partener și raport white-label, fără numele nostru.",
    link: "Scrieți-ne",
    href: "/contact",
  },
  en: {
    eyebrow: "Trusted by agencies",
    titlu: "PR agencies work with us",
    p1: "For more than a year, PR and communication agencies in Romania have distributed releases for very large clients through the MediaExpres network: international retail and fashion brands, service, real estate and industrial companies.",
    p2: "The agency sends us the release, we publish it on 50 online news sites across every county and deliver the report with all live links, ready for their client.",
    cifre: [
      { v: "1+ yr", l: "working with PR agencies" },
      { v: "50", l: "news sites, every county" },
      { v: "12 h", l: "from release to live links" },
    ],
    eticheta: "Case study · international",
    caz: "A Chinese marketing group with 650+ specialists and 1,000+ clients chose us for the Romanian distribution of an international automotive brand's press release.",
    detalii: ["International automotive brand", "50 news sites", "Translated from English"],
    cta: "Working at an agency? Partner pricing and a white-label report, without our name.",
    link: "Contact us",
    href: "mailto:contact@mediaexpress.ro",
  },
} as const;

// Direcție: pagină de ziar. Hârtie caldă, filete duble ca la o primă pagină,
// cifre mari în serif despărțite de linii verticale, studiul de caz ca o
// „telegramă” din Qingdao pe negru (logo-ul Deep Media e alb). Fără carduri
// identice, fără gradienturi: rețeaua e de ziare, așa că secțiunea arată a ziar.
export function Agentii({ lang = "ro" }: { lang?: "ro" | "en" }) {
  const t = TEXT[lang];
  return (
    <section className="bg-[#F6F2EA] text-slate-900" aria-label={t.titlu}>
      <div className="container py-16 md:py-24">
        <div className="border-y-[3px] border-double border-slate-900 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-700">
          {t.eyebrow}
        </div>
        <div className="mt-10 grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <h2 className="font-serif text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">{t.titlu}</h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-800 first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-6xl first-letter:font-bold first-letter:leading-[0.8] first-letter:text-brand-red">
              {t.p1}
            </p>
            <p className="mt-4 leading-relaxed text-slate-700">{t.p2}</p>
            <dl className="mt-10 grid grid-cols-3 divide-x divide-slate-300 border-y border-slate-300">
              {t.cifre.map((c) => (
                <div key={c.l} className="px-3 py-5 first:pl-0 md:px-6">
                  <dt className="sr-only">{c.l}</dt>
                  <dd className="font-serif text-3xl font-bold text-slate-900 md:text-5xl">{c.v}</dd>
                  <dd className="mt-2 text-xs uppercase tracking-wider text-slate-600 md:text-[13px]">{c.l}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-sm text-slate-700">
              {t.cta}{" "}
              <Link href={t.href} className="font-semibold text-brand-red underline decoration-2 underline-offset-4">
                {t.link} →
              </Link>
            </p>
          </div>
          <figure className="self-start bg-[#111] p-8 text-white md:p-10">
            <div className="flex items-center justify-between border-b border-white/20 pb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/60">
              <span>{t.eticheta}</span>
              <span className="text-brand-red">●</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/clienti/deep-media.png" alt="Deep Media (China)" loading="lazy" className="mt-8 h-10 w-auto object-contain md:h-12" />
            <blockquote className="mt-8 font-serif text-2xl leading-snug md:text-[28px]">
              <span className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">Qingdao, China — </span>
              {t.caz}
            </blockquote>
            <ul className="mt-8 border-t border-white/20 pt-4 text-sm text-white/75">
              {t.detalii.map((d) => (
                <li key={d} className="flex items-center gap-3 py-1">
                  <span className="h-px w-5 bg-brand-red" aria-hidden />
                  {d}
                </li>
              ))}
            </ul>
          </figure>
        </div>
      </div>
    </section>
  );
}
