import type { Metadata } from "next";
import Link from "next/link";
import { dezaboneaza, tokenValid } from "@/lib/dezabonare";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dezabonare", robots: { index: false, follow: false } };

export default async function Dezabonare({ searchParams }: { searchParams: { e?: string; t?: string; gata?: string } }) {
  let ok = searchParams.gata === "1";
  const e = (searchParams.e || "").trim().toLowerCase();
  if (!ok && e && tokenValid(e, searchParams.t || "")) {
    await dezaboneaza(e);
    ok = true;
  }
  return (
    <section className="container max-w-xl py-20 text-center">
      <h1 className="font-serif text-3xl font-bold text-brand-navy">{ok ? "Te-ai dezabonat" : "Linkul nu mai e valid"}</h1>
      <p className="mt-4 text-slate-700">
        {ok
          ? "Nu mai primești emailuri de promovare de la MediaExpres. Emailurile legate de o comandă (factură, raport) le primești în continuare, dacă ai comandat."
          : "Nu am putut găsi adresa. Scrie-ne „STOP” la contact@mediaexpress.ro și te scoatem din listă."}
      </p>
      <p className="mt-8">
        <Link href="/" className="text-brand-red underline">Înapoi pe site</Link>
      </p>
    </section>
  );
}
