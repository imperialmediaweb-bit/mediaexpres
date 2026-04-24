import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Verifica-ti emailul",
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <section className="container py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <Mail className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="mt-5 font-serif text-2xl font-bold text-brand-navy">
          Verifica-ti emailul
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Ti-am trimis un link magic. Deschide emailul si apasa pe link ca sa
          intri in cont. Link-ul expira in 24 ore.
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Nu a ajuns? Verifica folder-ul de spam sau incearca din nou cu o alta
          adresa.
        </p>
        <div className="mt-6">
          <Button variant="outline" asChild>
            <Link href="/cont/login">Inapoi la login</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
