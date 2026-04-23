import { Info } from "lucide-react";
import { PRICING_NOTE } from "@/data/packages";

export function PricingNote() {
  return (
    <div className="rounded-xl border-l-4 border-brand-gold bg-brand-gold/10 p-6">
      <div className="flex gap-4">
        <Info className="h-6 w-6 shrink-0 text-brand-gold" />
        <div>
          <h4 className="font-serif text-lg font-semibold text-brand-navy">
            Mențiune importantă
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{PRICING_NOTE}</p>
        </div>
      </div>
    </div>
  );
}
