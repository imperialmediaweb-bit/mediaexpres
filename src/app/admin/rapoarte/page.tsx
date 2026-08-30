import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { RaportForm } from "./RaportForm";

export const dynamic = "force-dynamic";

export default function AdminRapoartePage({
  searchParams,
}: {
  searchParams?: { email?: string; client?: string; titlu?: string };
}) {
  const session = getSession();
  if (!session) redirect("/admin/login?from=/admin/rapoarte");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-serif text-2xl font-bold text-brand-navy">
        Raport publicare
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Totul dintr-un loc: lipești linkurile (unul pe linie), atașezi factura
        PDF, iar clientul primește un singur email cu lista clickabilă,
        raportul generat automat în PDF și Excel, plus factura.
      </p>
      <div className="mt-8">
        {/* Prefill din pagina comenzii — butonul "Trimite raport + factura"
            vine incoace cu datele clientului deja puse, ca sa nu le mai
            copieze nimeni de mana dintr-un tab in altul. */}
        <RaportForm
          initialEmail={searchParams?.email || ""}
          initialClientName={searchParams?.client || ""}
          initialTitle={searchParams?.titlu || ""}
        />
      </div>
    </div>
  );
}
