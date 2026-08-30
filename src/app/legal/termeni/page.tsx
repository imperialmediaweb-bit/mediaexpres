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
        maximum 24 de ore lucrătoare de la confirmarea plății și primirea textului.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">4. Conținut interzis</h2>
      <p>
        Nu publicăm conținut care: încalcă legea română sau europeană, conține calomnii,
        incită la ură, promovează substanțe ilegale, este pornografic sau defăimător. MediaExpres
        își rezervă dreptul de a refuza publicarea.
      </p>
      <p>
        <strong>Conținut medical.</strong> Nu publicăm articole care prezintă cauze, metode de
        tratare sau vindecare pentru boli — inclusiv cancer, boli cronice sau afecțiuni grave —
        și nici produse, suplimente ori terapii prezentate ca alternativă la tratamentul medical.
        Regula se aplică fără excepții, indiferent de client sau de sursele invocate.
      </p>
      <p>
        <strong>Declarația clientului.</strong> La trimiterea comenzii, clientul declară pe proprie
        răspundere că materialul nu intră în categoriile de mai sus. Declarația este obligatorie și
        se bifează în formular înainte de trimitere.
      </p>
      <p>
        <strong>Ce se întâmplă dacă declarația e falsă.</strong> Dacă materialul primit încalcă
        regulile de conținut, comanda se anulează, articolul nu se publică (iar dacă a fost deja
        publicat, se retrage de pe toate site-urile), <strong>și suma plătită nu se
        restituie</strong> — costurile de verificare, redactare și publicare sunt deja făcute.
        Clientul rămâne singurul răspunzător pentru conținutul trimis. Dacă noi refuzăm comanda din
        alt motiv decât încălcarea acestor reguli, banii se returnează integral în 3 zile lucrătoare.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">5. Permanența publicării</h2>
      <p>
        Articolele rămân publicate pe site-urile partenere pe durata nelimitată, cu condiția ca
        site-urile respective să fie active. Nu garantăm funcționarea pe termen nelimitat a fiecărui
        site partener individual.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">6. Raport de publicare</h2>
      <p>
        Raportul PDF include URL-urile articolelor publicate. Distribuția pe
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
