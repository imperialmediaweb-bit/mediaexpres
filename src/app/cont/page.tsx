import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Repeat,
  FileText,
  Download,
  Image as ImageIcon,
  Sparkles,
  Target,
} from "lucide-react";

export default async function ContPage() {
  const session = await auth();
  if (!session?.user) redirect("/cont/login");

  const first = (session.user.name || session.user.email || "").split(" ")[0];

  return (
    <section className="container py-12">
      <div className="max-w-5xl">
        <p className="eyebrow">Contul meu</p>
        <h1 className="h1 mt-2">Salut, {first}</h1>
        <p className="lead mt-3 text-slate-600">
          De aici gestionezi comenzile, abonamentul, articolele si pozele. Accesul la
          lista ziarelor si upload-ul de continut se activeaza dupa confirmarea primei plati.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card
            icon={ShoppingBag}
            title="Comenzi"
            description="Istoricul platilor si al articolelor publicate."
            href="/cont/comenzi"
          />
          <Card
            icon={Repeat}
            title="Abonament"
            description="Status abonament, plati viitoare, articole ramase in luna."
            href="/cont/abonament"
          />
          <Card
            icon={FileText}
            title="Articolele mele"
            description="Draft-uri, articole trimise si articole publicate."
            href="/cont/articole"
          />
          <Card
            icon={ImageIcon}
            title="Poze articol"
            description="Pana la 3 poze pentru fiecare articol. Se ataseaza automat."
            href="/cont/articole"
          />
          <Card
            icon={Sparkles}
            title="Generare articol AI"
            description="Ai doar o idee? Generam textul conform politicilor noastre."
            href="/cont/articole/nou"
          />
          <Card
            icon={Download}
            title="Lista ziarelor (PDF)"
            description="Disponibila dupa prima plata. Descarcare direct din cont."
            href="/cont/lista"
          />
          <Card
            icon={Target}
            title="Strateg Editorial AI"
            description="Genereaza 5 idei de articole tailored brandului tau in 30 secunde. Gratuit."
            href="/strateg-ai"
          />
        </div>

        <div className="mt-12 rounded-2xl border border-dashed border-slate-300 p-8">
          <h2 className="h2">Prima comanda?</h2>
          <p className="lead mt-3 text-slate-600">
            Completeaza formularul de comanda. Primesti proforma pe email cu IBAN-ul nostru, faci transferul, iar noi publicam articolul. Factura finala vine dupa publicare.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="accent" size="lg" asChild>
              <Link href="/pachete">Vezi pachete</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/oferta">Citeste oferta</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Card({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-6 transition hover:border-brand-red hover:shadow-md"
    >
      <Icon className="h-8 w-8 text-brand-red" />
      <h3 className="mt-4 font-serif text-lg font-bold text-brand-navy group-hover:text-brand-red">
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </Link>
  );
}
