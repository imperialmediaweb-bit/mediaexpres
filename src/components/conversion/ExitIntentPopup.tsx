"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, MessageCircle, ShieldCheck, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RequestListForm } from "@/components/forms/RequestListForm";
import { promoDeadlineLabel } from "@/data/packages";
import { SITE } from "@/data/site";
import { trackGaEvent } from "@/components/analytics/GoogleAnalytics";

const STORAGE_KEY = "me_exit_intent_shown";
// Pe mobil nu exista mouse-leave; declansam tarziu, ca sa nu intrerupem un om
// care inca citeste. 45s pe pagina de oferta inseamna ca a citit si ezita.
const MOBILE_DELAY_MS = 45000;

/**
 * Ultimul cuvant inainte de plecare.
 *
 * Varianta veche oferea aici formularul "primeste lista pe email" — adica il
 * scotea pe om DIN drumul de cumparare exact in momentul deciziei, desi lista
 * e deja publica pe pagina. Un popup de iesire pe o pagina de vanzare are o
 * singura treaba: sa vanda. Raspunde la cele doua frici care opresc prima
 * comanda (risc + "n-am timp acum") si abia apoi ofera emailul, ca ultima
 * varianta pentru cine chiar nu se hotaraste azi.
 */
export function ExitIntentPopup() {
  const [open, setOpen] = useState(false);
  const [vreaEmail, setVreaEmail] = useState(false);
  const deadline = promoDeadlineLabel();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY) === "1") return;

    const trigger = () => {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
      sessionStorage.setItem(STORAGE_KEY, "1");
      trackGaEvent("view_promotion", { promotion_name: "exit_intent" });
      setOpen(true);
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10) trigger();
    };
    document.addEventListener("mouseleave", onMouseLeave);

    const timerId = window.setTimeout(trigger, MOBILE_DELAY_MS);

    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      window.clearTimeout(timerId);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stai — riscul e al nostru, nu al tău</DialogTitle>
          <DialogDescription>
            Articolul tău în 50 de ziare, cu factură fiscală, pentru 500 lei
            {deadline ? ` — ofertă valabilă până pe ${deadline}` : ""}. Plătești cu
            cardul sau prin ordin de plată, după ce primești factura.
          </DialogDescription>
        </DialogHeader>

        <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Garanție:</strong> nu publicăm în 24 de ore lucrătoare? Îți dăm toți
            banii înapoi.
          </span>
        </p>

        <div className="grid gap-2">
          <Link
            href="/oferta-500#oferta"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-3 text-base font-bold text-white transition hover:bg-brand-red/90"
          >
            <CreditCard className="h-5 w-5" />
            Comandă acum — 500 lei
          </Link>
          <a
            href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
              "Bună ziua! Mă interesează articolul în 50 de ziare (500 lei), dar am o întrebare înainte.",
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackGaEvent("contact", { method: "whatsapp_exit" })}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-navy"
          >
            <MessageCircle className="h-4 w-4" />
            Am o întrebare — WhatsApp
          </a>
        </div>

        {vreaEmail ? (
          <RequestListForm successHref="/pachete" successCtaLabel="Vezi prețurile acum" />
        ) : (
          <button
            type="button"
            onClick={() => setVreaEmail(true)}
            className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 underline decoration-dotted underline-offset-2 hover:text-slate-700"
          >
            <Mail className="h-3.5 w-3.5" />
            Nu azi? Îți trimitem oferta pe email
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
