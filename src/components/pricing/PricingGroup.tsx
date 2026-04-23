import { PackageCard } from "./PackageCard";
import type { Package } from "@/data/packages";

interface PricingGroupProps {
  packages: Package[];
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
}

export function PricingGroup({ packages, id, eyebrow, title, description }: PricingGroupProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="h2 mt-2">{title}</h2>
        {description && <p className="lead mt-4">{description}</p>}
      </div>
      <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {packages.map((p) => (
          <PackageCard key={p.id} pkg={p} />
        ))}
      </div>
    </section>
  );
}
