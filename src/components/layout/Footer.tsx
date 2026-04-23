import Link from "next/link";
import { Mail, Phone, MapPin, Clock, Facebook, Linkedin } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SITE, FOOTER_LINKS } from "@/data/site";

export function Footer() {
  return (
    <footer className="bg-brand-navy text-brand-ivory">
      <div className="container py-16">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Logo variant="white" showTagline />
            <p className="mt-6 max-w-sm text-sm text-white/70 leading-relaxed">
              Distribuție de comunicate de presă pe 50 de ziare românești și 37 pagini
              Facebook. Livrare în 24h, raport PDF complet, linkuri permanente online.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href={SITE.social.facebook}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-brand-red transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href={SITE.social.linkedin}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-brand-red transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          <FooterColumn title="Servicii" links={FOOTER_LINKS.servicii} />
          <FooterColumn title="Companie" links={FOOTER_LINKS.companie} />

          <div>
            <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">
              Contact
            </h4>
            <ul className="space-y-3 text-sm text-white/80">
              <li className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-brand-gold" />
                <a href={`mailto:${SITE.email}`} className="hover:text-white">
                  {SITE.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-0.5 text-brand-gold" />
                <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="hover:text-white">
                  {SITE.phone}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-brand-gold" />
                <span>{SITE.address}</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-brand-gold" />
                <span>{SITE.schedule}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-white/60">
            &copy; {new Date().getFullYear()} {SITE.name}. Toate drepturile rezervate.
          </p>
          <ul className="flex flex-wrap gap-6 text-xs">
            {FOOTER_LINKS.legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/70 hover:text-white transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">
        {title}
      </h4>
      <ul className="space-y-3 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-white/80 hover:text-white transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
