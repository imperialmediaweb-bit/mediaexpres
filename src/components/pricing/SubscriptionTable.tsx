"use client";

import { Check } from "lucide-react";
import { OrderModal } from "@/components/forms/OrderModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_BENEFITS } from "@/data/packages";
import { formatPrice, cn } from "@/lib/utils";

export function SubscriptionTable() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-xl border bg-white p-6 transition-all",
              plan.featured
                ? "border-brand-gold shadow-lg ring-1 ring-brand-gold/30"
                : "border-slate-200 hover:shadow-md hover:-translate-y-0.5"
            )}
          >
            {plan.featured && (
              <Badge variant="gold" className="absolute -top-3 left-6">
                Preferat
              </Badge>
            )}
            <h3 className="font-serif text-2xl font-bold text-brand-navy">{plan.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{plan.description}</p>

            <div className="mt-5 space-y-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Standard
                </div>
                <div className="mt-0.5 font-serif text-3xl font-bold text-brand-navy">
                  {formatPrice(plan.priceStandard)}
                  <span className="ml-1 text-sm font-medium text-slate-500">lei/lună</span>
                </div>
              </div>
              <div className="rounded-md bg-brand-red/5 px-3 py-2">
                <div className="text-xs font-medium uppercase tracking-wider text-brand-red">
                  Cazino / iGaming
                </div>
                <div className="mt-0.5 font-serif text-2xl font-bold text-brand-red">
                  {formatPrice(plan.priceCasino)}
                  <span className="ml-1 text-sm font-medium text-red-500/70">lei/lună</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex-1">
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <strong className="text-brand-navy">{plan.distributionsPerMonth}</strong>{" "}
                  {plan.distributionsPerMonth === 1 ? "articol" : "articole"} × 50 ziare
                </li>
                <li>
                  <strong className="text-brand-navy">
                    {plan.distributionsPerMonth * plan.newspapersPerDistribution}
                  </strong>{" "}
                  publicări totale lunar
                </li>
              </ul>
            </div>

            <OrderModal
              defaultPackageId={`sub-${plan.id}`}
              trigger={
                <Button variant={plan.featured ? "gold" : "outline"} className="mt-6 w-full">
                  Alege {plan.name}
                </Button>
              }
            />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-brand-navy/10 bg-white p-6">
        <p className="eyebrow mb-3">Toate abonamentele includ</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SUBSCRIPTION_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
