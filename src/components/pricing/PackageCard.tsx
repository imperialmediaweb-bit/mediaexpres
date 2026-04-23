"use client";

import { Check, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderModal } from "@/components/forms/OrderModal";
import { formatPrice, cn } from "@/lib/utils";
import type { Package } from "@/data/packages";

interface PackageCardProps {
  pkg: Package;
}

export function PackageCard({ pkg }: PackageCardProps) {
  const isFeatured = !!pkg.featured;

  return (
    <div
      id={pkg.id}
      className={cn(
        "relative flex flex-col rounded-2xl border bg-white p-8 transition-all duration-300",
        isFeatured
          ? "border-brand-red shadow-2xl lg:-translate-y-4 lg:scale-[1.03] ring-1 ring-brand-red/20"
          : "border-slate-200 hover:shadow-xl hover:-translate-y-1"
      )}
    >
      {pkg.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant={isFeatured ? "accent" : "gold"} className="px-4 py-1.5 text-sm">
            {pkg.badge}
          </Badge>
        </div>
      )}

      <div className="flex items-center gap-2 text-brand-red">
        <Newspaper className="h-5 w-5" />
        <span className="text-xs font-bold uppercase tracking-[0.15em]">
          {pkg.category === "casino" ? "Cazino / iGaming" : "Standard"}
        </span>
      </div>

      <h3 className="mt-4 font-serif text-3xl font-bold text-brand-navy">{pkg.name}</h3>
      <p className="mt-1 text-sm text-slate-600">{pkg.tagline}</p>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-serif text-5xl font-bold text-brand-navy">
          {formatPrice(pkg.price)}
        </span>
        <span className="text-lg font-medium text-slate-500">lei</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">TVA inclus • plată o singură dată</p>

      <div className="mt-5 rounded-lg bg-brand-ivory px-4 py-3 text-sm">
        <p className="font-semibold text-brand-navy">{pkg.reach}</p>
      </div>

      <ul className="mt-6 space-y-3 flex-1">
        {pkg.highlights.map((h) => (
          <li key={h} className="flex items-start gap-3 text-sm text-slate-700">
            <Check className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
            <span>{h}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <OrderModal
          defaultPackageId={pkg.id}
          trigger={
            <Button
              variant={isFeatured ? "accent" : "default"}
              size="lg"
              className="w-full"
            >
              Comandă {pkg.name}
            </Button>
          }
        />
      </div>
    </div>
  );
}
