"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/data/site";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-slate-100 text-brand-navy"
        aria-label="Deschide meniul"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-brand-navy/70 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      {/*
        28.09.2026 — `invisible` NU era destul. Masurat pe telefon (390px):
        sertarul inchis, impins cu translate-x-full, statea la x 390–774 si
        latea pagina la 774px. Tot ce e `fixed left-0 right-0` se intindea
        dupa ea: bara „Comanda acum" iesea de doua ori mai lata, cu butonul
        decalat, iar butonul verde de WhatsApp (right-4) ajungea la x 702 —
        in afara ecranului. visibility:hidden ascunde elementul, dar il lasa
        in calculul latimii.

        Acum sertarul sta intr-un container `fixed inset-0 overflow-hidden`,
        care il taie la marginea ecranului indiferent unde e impins. Cat e
        inchis, containerul nu prinde atingeri.
      */}
      <div
        className={cn("fixed inset-0 z-50 overflow-hidden", open ? "" : "pointer-events-none")}
        aria-hidden={!open}
      >
      <aside
        className={cn(
          "absolute top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl transition-[transform,visibility] duration-300",
          open ? "translate-x-0" : "invisible translate-x-full delay-150"
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <span className="font-serif text-xl font-bold text-brand-navy">Meniu</span>
          <button
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-slate-100 text-brand-navy"
            aria-label="Închide meniul"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-4 py-3 text-base font-medium text-brand-navy hover:bg-brand-ivory"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 mt-4 border-t border-slate-200">
          <Button
            variant="accent"
            className="w-full"
            asChild
            onClick={() => setOpen(false)}
          >
            <Link href="/comanda">Comandă acum</Link>
          </Button>
        </div>
      </aside>
      </div>
    </div>
  );
}
