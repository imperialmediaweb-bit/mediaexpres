import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Politica de confidențialitate",
  description: "Cum colectăm, folosim și protejăm datele tale personale.",
  alternates: { canonical: "/legal/confidentialitate" },
};

export default function ConfidentialitatePage() {
  return (
    <LegalLayout title="Politica de confidențialitate" updated="23 aprilie 2026">
      <p>
        MediaExpres respectă confidențialitatea datelor tale personale și le prelucrează în
        conformitate cu Regulamentul (UE) 2016/679 (GDPR) și legislația română aplicabilă.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">Operator de date</h2>
      <p>
        MediaExpres SRL (denumit &bdquo;noi&rdquo;), cu sediul în București, România, email{" "}
        <a href="mailto:contact@mediaexpress.ro">contact@mediaexpress.ro</a>.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">Ce date colectăm</h2>
      <ul>
        <li>Nume și prenume</li>
        <li>Adresa de email</li>
        <li>Numărul de telefon</li>
        <li>Numele companiei (opțional)</li>
        <li>Conținutul mesajelor trimise prin formularele de pe site</li>
      </ul>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">În ce scop</h2>
      <ul>
        <li>Procesarea comenzilor</li>
        <li>Răspuns la mesajele de contact</li>
        <li>Trimiterea listei de ziare la cerere (lead magnet)</li>
        <li>Facturare și evidență contabilă</li>
        <li>Obligații legale</li>
      </ul>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">Durata stocării</h2>
      <p>
        Datele sunt păstrate cât este necesar pentru îndeplinirea scopurilor menționate, plus perioada
        legală de arhivare (contabilitate: 10 ani).
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">Drepturile tale</h2>
      <ul>
        <li>Dreptul de acces la datele tale</li>
        <li>Dreptul la rectificare</li>
        <li>Dreptul la ștergere (&bdquo;dreptul de a fi uitat&rdquo;)</li>
        <li>Dreptul la restricționarea prelucrării</li>
        <li>Dreptul la portabilitate</li>
        <li>Dreptul de opoziție</li>
        <li>Dreptul de a depune plângere la ANSPDCP</li>
      </ul>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">Contact</h2>
      <p>
        Pentru exercitarea oricăruia dintre drepturile de mai sus, scrie-ne la{" "}
        <a href="mailto:contact@mediaexpress.ro">contact@mediaexpress.ro</a>. Răspundem în maximum 30
        de zile.
      </p>
    </LegalLayout>
  );
}
