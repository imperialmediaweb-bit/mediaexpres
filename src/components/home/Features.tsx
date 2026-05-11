import {
  Newspaper,
  Facebook,
  Clock,
  FileText,
  Link2,
  Headphones,
} from "lucide-react";

const FEATURES = [
  {
    icon: Newspaper,
    title: "50 de ziare partenere",
    description: "41 ziare locale + 9 naționale, acoperire în toate cele 4 regiuni.",
  },
  {
    icon: Facebook,
    title: "50 pagini Facebook",
    description: "Distribuție automată pe paginile asociate. Include fiecare pachet.",
  },
  {
    icon: Clock,
    title: "Livrare în 24h",
    description: "Publicare rapidă pe toate site-urile. Linkurile ajung la tine imediat.",
  },
  {
    icon: FileText,
    title: "Raport PDF complet",
    description: "URL-uri + screenshot-uri pentru toate articolele publicate.",
  },
  {
    icon: Link2,
    title: "Linkuri permanente",
    description: "Articolele rămân online indefinit. SEO on-page + backlinks câștigate.",
  },
  {
    icon: Headphones,
    title: "Suport dedicat",
    description: "Echipă PR cu care vorbești direct pe email, telefon sau WhatsApp.",
  },
];

export function Features() {
  return (
    <section className="section bg-newsprint">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">De ce MediaExpres</p>
          <h2 className="h2 mt-2">Tot ce primești, în fiecare pachet</h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-slate-200 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brand-red/30 hover:shadow-xl"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red transition-colors group-hover:bg-brand-red group-hover:text-white">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-serif text-lg font-semibold text-brand-navy">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
