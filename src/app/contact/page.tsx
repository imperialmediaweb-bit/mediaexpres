import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/forms/ContactForm";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact — MediaExpres",
  description: "Ia legătura cu echipa MediaExpres. Răspundem în maximum 2 ore în program.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-brand-navy text-white">
        <div className="container py-20 text-center">
          <p className="eyebrow text-brand-gold">Contactează-ne</p>
          <h1 className="h1 mt-3 text-white">Discutăm proiectul tău</h1>
          <p className="lead mx-auto mt-6 max-w-2xl text-white/85">
            Ai o întrebare, vrei o ofertă personalizată sau pur și simplu vrei să discuți înainte
            de a comanda? Suntem la un email distanță.
          </p>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <h2 className="h3">Date de contact</h2>
              <ul className="mt-6 space-y-5 text-base">
                <InfoRow icon={Mail} label="Email">
                  <a href={`mailto:${SITE.email}`} className="text-brand-navy hover:text-brand-red">
                    {SITE.email}
                  </a>
                </InfoRow>
                <InfoRow icon={Phone} label="Telefon">
                  <a
                    href={`tel:${SITE.phone.replace(/\s/g, "")}`}
                    className="text-brand-navy hover:text-brand-red"
                  >
                    {SITE.phone}
                  </a>
                </InfoRow>
                <InfoRow icon={MapPin} label="Sediu">
                  {SITE.address}
                </InfoRow>
                <InfoRow icon={Clock} label="Program">
                  {SITE.schedule}
                </InfoRow>
              </ul>
              <div className="mt-10 rounded-xl bg-brand-ivory p-6">
                <h3 className="font-serif text-lg font-semibold text-brand-navy">
                  Răspundem rapid
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Timp mediu de răspuns: sub 2 ore în timpul programului. Pentru urgențe sună
                  direct.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="h3">Scrie-ne</h2>
              <p className="mt-2 text-sm text-slate-600">
                Completează formularul și te contactăm rapid.
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div className="mt-0.5 font-medium text-brand-navy">{children}</div>
      </div>
    </li>
  );
}
