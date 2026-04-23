import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="section bg-white">
      <div className="container text-center max-w-xl mx-auto">
        <p className="eyebrow">404</p>
        <h1 className="h1 mt-3">Pagina nu există</h1>
        <p className="lead mt-4">
          Ne pare rău, nu găsim pagina căutată. Probabil a fost mutată sau ștearsă.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">Înapoi acasă</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/pachete">Vezi pachetele</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
