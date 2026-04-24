import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "GDPR",
  description: "Drepturile tale conform Regulamentului General privind Protecția Datelor (GDPR).",
  alternates: { canonical: "/legal/gdpr" },
};

export default function GdprPage() {
  return (
    <LegalLayout title="GDPR — Drepturile tale" updated="23 aprilie 2026">
      <p>
        Conform Regulamentului (UE) 2016/679 (GDPR), ai următoarele drepturi privind datele tale
        personale:
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">1. Dreptul de informare</h2>
      <p>Ai dreptul să știi ce date colectăm, în ce scop și pentru cât timp le păstrăm.</p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">2. Dreptul de acces</h2>
      <p>Poți solicita oricând o copie a datelor personale pe care le avem despre tine.</p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">3. Dreptul la rectificare</h2>
      <p>Dacă datele sunt inexacte sau incomplete, ai dreptul să ceri corectarea lor.</p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">4. Dreptul la ștergere</h2>
      <p>Poți cere ștergerea datelor (&bdquo;dreptul de a fi uitat&rdquo;) cu excepția obligațiilor legale de arhivare.</p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">5. Dreptul la restricționare</h2>
      <p>Poți cere oprirea temporară a prelucrării datelor în anumite situații.</p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">6. Dreptul la portabilitate</h2>
      <p>Poți cere să primești datele într-un format structurat și să le transferi la alt operator.</p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">7. Dreptul de opoziție</h2>
      <p>Te poți opune prelucrării datelor pentru marketing direct sau pe bază de interese legitime.</p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">Cum îți exerciți drepturile</h2>
      <p>
        Scrie-ne la <a href="mailto:contact@mediaexpress.ro">contact@mediaexpress.ro</a> cu cererea
        ta clară. Răspundem în maximum 30 de zile. Pentru mai multe detalii, consultă și{" "}
        <Link href="/legal/confidentialitate">politica de confidențialitate</Link>.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">Plângeri</h2>
      <p>
        Ai dreptul de a depune plângere la Autoritatea Națională de Supraveghere a Prelucrării
        Datelor cu Caracter Personal (ANSPDCP): Bd. General Gheorghe Magheru 28-30, Sector 1,
        010336 București, <a href="mailto:anspdcp@dataprotection.ro">anspdcp@dataprotection.ro</a>.
      </p>
    </LegalLayout>
  );
}
