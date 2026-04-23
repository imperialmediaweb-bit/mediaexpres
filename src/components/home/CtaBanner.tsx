import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderModal } from "@/components/forms/OrderModal";

export function CtaBanner() {
  return (
    <section className="relative overflow-hidden bg-cta-gradient py-20 text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="container relative">
        <div className="mx-auto max-w-3xl text-center">
          <Sparkles className="mx-auto h-10 w-10 text-brand-gold" />
          <h2 className="mt-6 font-serif text-4xl font-bold leading-tight sm:text-5xl">
            Pregătit să-ți publici articolul?
          </h2>
          <p className="mt-6 text-lg text-white/90">
            Alege un pachet, trimite-ne articolul, iar în 24h ești pe 50 de ziare. Nu plătești
            nimic până nu confirmăm capacitatea de publicare.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button variant="gold" size="lg" asChild>
              <Link href="/pachete">
                Vezi pachetele <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <OrderModal
              trigger={
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-white/10 text-white hover:bg-white hover:text-brand-navy"
                >
                  Comandă acum
                </Button>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
