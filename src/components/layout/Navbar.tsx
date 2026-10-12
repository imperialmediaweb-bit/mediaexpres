"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/data/site";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/admin")) return null;

  // Pe /en: antet simplu in engleza, fara meniul romanesc (pachete in lei).
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/en" aria-label="MediaExpres">
            <Logo />
          </Link>
          <a href="#order" className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white">
            Order now
          </a>
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="container flex h-20 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Principal">
          {NAV_LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors link-underline",
                  active ? "text-brand-red" : "text-brand-navy hover:text-brand-red"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden lg:block">
          <Button asChild variant="accent">
            <Link href="/oferta-500">Comandă acum</Link>
          </Button>
        </div>
        <MobileNav />
      </div>
    </header>
  );
}
