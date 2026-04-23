import { STATS } from "@/data/site";

export function Stats() {
  return (
    <section className="bg-brand-navy text-white">
      <div className="container py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center lg:text-left">
              <div className="font-serif text-5xl font-bold text-brand-gold sm:text-6xl">
                {s.value}
              </div>
              <div className="mt-2 text-sm font-medium uppercase tracking-wider text-white/80">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
