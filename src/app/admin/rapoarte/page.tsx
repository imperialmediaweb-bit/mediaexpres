import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { RaportForm } from "./RaportForm";

export const dynamic = "force-dynamic";

export default function AdminRapoartePage() {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/rapoarte");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-serif text-2xl font-bold text-brand-navy">
        Raport publicare
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        După ce publici articolul, trimite clientului raportul de aici: lipești
        linkurile (unul pe linie) și/sau atașezi Excelul tău. Clientul primește
        un email cu lista clickabilă + fișierul atașat.
      </p>
      <div className="mt-8">
        <RaportForm />
      </div>
    </div>
  );
}
