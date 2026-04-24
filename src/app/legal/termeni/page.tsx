import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Termeni și condiții",
  description: "Termenii și condițiile de utilizare a serviciilor MediaExpres.",
  alternates: { canonical: "/legal/termeni" },
};

export default function TermeniPage() {
  return (
    <LegalLayout title="Termeni și condiții" updated="23 aprilie 2026">
      <h2 className="font-serif text-2xl font-bold text-brand-navy">1. Obiectul contractului</h2>
      <p>
        MediaExpres oferă servicii de distribuție a comunicatelor de presă pe o rețea de ziare și
        pagini Facebook partenere, conform pachetului ales de client.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">2. Comandă și plată</h2>
      <p>
        Comanda se plasează prin formularul online. După confirmarea comenzii, clientul primește
        factura și efectuează plata prin transfer bancar. Publicarea începe după confirmarea plății.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">3. Termen de livrare</h2>
      <p>
        MediaExpres se angajează să publice articolul pe toate site-urile din pachetul ales în
        maximum 24 de ore de la confirmarea plății și primirea textului.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">4. Conținut interzis</h2>
      <p>
        Nu publicăm conținut care: încalcă legea română sau europeană, conține calomnii,
        incită la ură, promovează substanțe ilegale, este pornografic sau defăimător. MediaExpres
        își rezervă dreptul de a refuza publicarea.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">5. Permanența publicării</h2>
      <p>
        Articolele rămân publicate pe site-urile partenere pe durata nelimitată, cu condiția ca
        site-urile respective să fie active. Nu garantăm funcționarea pe termen nelimitat a fiecărui
        site partener individual.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">6. Raport de publicare</h2>
      <p>
        Raportul PDF include URL-urile și screenshot-urile articolelor publicate. Distribuția pe
        Facebook este inclusă automat, dar statisticile paginilor de Facebook nu pot fi colectate
        în raport.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">7. Abonamente</h2>
      <p>
        Abonamentele lunare se facturează la începutul fiecărei luni. Clientul poate anula abonamentul
        cu minim 15 zile înainte de finalul lunii curente, printr-un email la contact@mediaexpress.ro.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">8. Răspundere</h2>
      <p>
        MediaExpres nu răspunde pentru conținutul editorial al articolelor furnizate de client. Clientul
        garantează că deține toate drepturile necesare asupra textului și imaginilor trimise.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">9. Legea aplicabilă</h2>
      <p>
        Prezentul contract este guvernat de legea română. Orice dispută va fi soluționată pe cale
        amiabilă sau, în subsidiar, de instanțele competente din România.
      </p>
    </LegalLayout>
  );
}
