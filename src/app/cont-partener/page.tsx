import type { Metadata } from "next";
import { LoginPartener } from "./LoginPartener";
import { PRAG_RETRAGERE } from "@/lib/decont";

export const metadata: Metadata = {
  title: "Contul de partener",
  robots: { index: false, follow: false },
};

export default function ContPartenerPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-14">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Publicații partenere</p>
      <h1 className="mt-1 font-serif text-3xl font-bold text-brand-navy">Contul tău de partener</h1>
      <p className="mt-3 text-slate-600">
        Vezi articolele primite, cât ai de încasat și ceri plata singur, de la {PRAG_RETRAGERE} de lei.
        Scrie adresa de email cu care te-ai înscris și îți trimitem linkul de intrare — fără parolă.
      </p>
      <div className="mt-6">
        <LoginPartener />
      </div>
    </main>
  );
}
