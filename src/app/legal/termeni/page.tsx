import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Termeni și condiții",
  description: "Termenii și condițiile de utilizare a serviciilor MediaExpres.",
  alternates: { canonical: "/legal/termeni" },
};

/*
  07.09.2026 — pagina veche avea 90 de randuri si nu apara firma de nimic.
  Nu spunea cine e vanzatorul (nici denumire, nici CUI, nici numar de
  inregistrare), nu limita raspunderea si, mai ales, nu spunea nicaieri ce NU
  garantam. La un serviciu de aparitii in presa asta e problema centrala:
  omul plateste 500 de lei si, daca nu-i scrie nimeni negru pe alb, poate
  crede ca a cumparat vanzari, trafic sau pozitii in Google.

  Regula pe care o tine pagina asta: ne obligam sa publicam si sa livram
  raportul cu linkuri — obligatie de mijloace, nu de rezultat. Aceleasi limite
  sunt scrise si in caseta „Ce NU iti promitem" de pe /oferta-500, ca omul sa
  citeasca acelasi lucru inainte de plata si in contract.
*/

const L = SITE.legal;

export default function TermeniPage() {
  return (
    <LegalLayout title="Termeni și condiții" updated="7 septembrie 2026">
      <h2 className="font-serif text-2xl font-bold text-brand-navy">1. Cine suntem</h2>
      <p>
        Serviciile prezentate pe acest site sunt prestate de <strong>{L.companyName}</strong>,
        CUI {L.cui}, înregistrată la Registrul Comerțului sub nr. {L.regCom}, cu sediul în{" "}
        {L.address}. MediaExpres este numele comercial sub care firma oferă aceste servicii.
      </p>
      <p>
        Contact: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>, telefon {SITE.phone},
        program {SITE.schedule}.
      </p>
      <p>{L.vat}</p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">2. Ce vindem</h2>
      <p>
        Publicarea unui articol publicitar (advertorial) în publicațiile online din rețeaua
        proprie MediaExpres, împreună cu distribuirea articolului pe paginile de Facebook
        asociate acestor publicații. Numărul de publicații și prețul sunt cele din pachetul ales
        la comandă.
      </p>
      <p>
        Serviciul <strong>nu este</strong> consultanță de marketing, optimizare pentru motoare de
        căutare (SEO), campanie de publicitate plătită sau serviciu de relații publice. Este
        publicare de conținut, atât.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">3. Ce NU garantăm</h2>
      <p>
        Obligația noastră este <strong>de mijloace, nu de rezultat</strong>: ne obligăm să
        publicăm articolul în publicațiile din pachet și să livrăm raportul cu toate linkurile.
        Nu ne obligăm să producem un anumit efect comercial. Concret, nu garantăm și nu putem
        garanta:
      </p>
      <ul>
        <li>trafic sau vizitatori pe site-ul clientului;</li>
        <li>vânzări, clienți, cereri de ofertă sau orice altă formă de conversie;</li>
        <li>poziții în Google sau în orice alt motor de căutare;</li>
        <li>indexarea articolelor de către motoarele de căutare;</li>
        <li>apariția în Google News, Google Discover sau agregatoare de știri;</li>
        <li>
          creșterea autorității domeniului sau a oricărui indicator SEO — Domain Authority (DA),
          Domain Rating (DR), Trust Flow sau similare, măsurate de instrumente terțe;
        </li>
        <li>
          modul în care motoarele de căutare tratează linkurile din articole, inclusiv dacă le
          iau sau nu în calcul;
        </li>
        <li>
          un anumit număr de afișări, aprecieri, comentarii sau distribuiri pe paginile de
          Facebook;
        </li>
        <li>un anumit număr de citiri ale articolului;</li>
        <li>preluarea articolului de către alte publicații din afara rețelei.</li>
      </ul>
      <p>
        Rezultatele comerciale depind de produsul sau serviciul promovat, de calitatea textului,
        de piață și de concurență — factori pe care nu îi controlăm. Orice cifră prezentată pe
        site cu titlu informativ (audiență, interacțiuni, număr de articole publicate) descrie
        activitatea rețelei, nu un rezultat promis clientului.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">4. Ce garantăm</h2>
      <ul>
        <li>
          publicarea în <strong>maximum 12 ore lucrătoare</strong> de la primirea materialului
          complet și confirmarea plății;
        </li>
        <li>raportul cu adresele (URL-urile) tuturor articolelor publicate;</li>
        <li>
          păstrarea articolelor online pe durată nelimitată, atât timp cât publicațiile
          respective funcționează;
        </li>
        <li>
          restituirea integrală a sumei dacă nu publicăm în termenul de mai sus, din motive care
          ne aparțin.
        </li>
      </ul>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">5. Comandă, plată și facturare</h2>
      <p>
        Comanda se plasează prin formularul online sau prin WhatsApp. Plata se face cu cardul
        (procesată de Stripe) sau prin transfer bancar, pe baza facturii fiscale emise pe datele
        firmei clientului. Publicarea începe după confirmarea plății — la plata cu cardul,
        imediat; la transfer bancar, după ce încasarea apare în extrasul de cont.
      </p>
      <p>
        Abonamentele lunare se facturează la începutul fiecărei luni și se pot anula cu minimum
        15 zile înainte de finalul lunii curente, printr-un email la{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Abonamentele se plătesc doar cu cardul.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">
        6. Materialul și răspunderea clientului
      </h2>
      <p>
        Textul și imaginile sunt furnizate de client. Prin trimiterea comenzii, clientul declară
        și garantează că deține toate drepturile de autor și de utilizare asupra materialului,
        că informațiile din el sunt reale și verificabile, că are acordul persoanelor menționate
        sau fotografiate și că materialul respectă legislația română și europeană, inclusiv
        regulile privind publicitatea.
      </p>
      <p>
        Nu verificăm și nu avem obligația să verificăm veridicitatea afirmațiilor din material.
        Dacă un terț formulează o reclamație, o sesizare la o autoritate sau o acțiune în
        instanță din cauza conținutului trimis de client, <strong>clientul răspunde integral</strong>{" "}
        și ne despăgubește pentru orice sumă la care am fi obligați, inclusiv cheltuieli de
        apărare.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">7. Conținut pe care nu îl publicăm</h2>
      <p>
        Nu publicăm conținut care: încalcă legea română sau europeană, conține calomnii ori atacuri
        la persoană, incită la ură sau discriminare, promovează substanțe ilegale, este pornografic
        sau defăimător.
      </p>
      <p>
        <strong>Jocuri de noroc și pariuri.</strong> Publicăm doar cu declarația clientului că
        operatorul este licențiat ONJN, cu mențiunile legale obligatorii și la tariful special
        pentru această categorie.
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
        Dacă refuzăm comanda din alt motiv decât încălcarea acestor reguli, banii se returnează
        integral în 3 zile lucrătoare.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">
        8. Dreptul de retragere (consumatori)
      </h2>
      <p>
        Clientul persoană fizică are, potrivit OUG 34/2014, dreptul de a se retrage din contract
        în 14 zile, fără motiv. Serviciul nostru fiind unul prestat imediat, prin bifarea
        declarației de la comandă clientul <strong>cere expres începerea prestării înainte de
        expirarea celor 14 zile</strong> și ia la cunoștință că <strong>pierde dreptul de
        retragere</strong> din momentul în care articolul a fost publicat. Până la publicare,
        comanda poate fi anulată integral, cu restituirea sumei.
      </p>
      <p>
        Pentru clienții persoane juridice, dreptul de retragere pentru consumatori nu se aplică.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">
        9. Modificarea sau retragerea articolului
      </h2>
      <p>
        Corecturile cerute în primele 48 de ore de la publicare se fac gratuit. După acest
        interval, modificările se tarifează separat. La cererea scrisă a clientului retragem
        articolul din publicațiile rețelei, fără restituirea sumei plătite.
      </p>
      <p>
        Nu putem șterge copiile preluate sau arhivate de terți — alte site-uri, agregatoare,
        arhive web sau rezultate păstrate în memoria motoarelor de căutare. Publicarea online este,
        din acest punct de vedere, ireversibilă.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">10. Limitarea răspunderii</h2>
      <p>
        Răspunderea noastră totală, indiferent de temei, <strong>nu poate depăși suma plătită de
        client pe comanda în cauză</strong>. Nu răspundem pentru pierderi indirecte: profit
        nerealizat, pierderea unor oportunități comerciale, prejudiciu de imagine sau pierderi de
        date.
      </p>
      <p>
        Nu răspundem pentru conținutul editorial al articolelor furnizate de client și nici pentru
        deciziile motoarelor de căutare, ale platformelor de socializare sau ale altor terți cu
        privire la articolele publicate.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">11. Forță majoră</h2>
      <p>
        Nu răspundem pentru întârzieri sau neexecutare cauzate de evenimente în afara controlului
        nostru: indisponibilitatea publicațiilor sau a furnizorilor de găzduire, atacuri
        informatice, întreruperi ale serviciilor Facebook, Stripe sau ale furnizorilor de email,
        precum și orice alt caz de forță majoră sau caz fortuit.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">12. Date personale</h2>
      <p>
        Modul în care prelucrăm datele personale este descris în{" "}
        <Link href="/legal/confidentialitate">politica de confidențialitate</Link>, iar folosirea
        cookie-urilor în <Link href="/legal/cookies">politica de cookies</Link>.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">
        13. Legea aplicabilă și soluționarea litigiilor
      </h2>
      <p>
        Contractul este guvernat de legea română. Orice neînțelegere se rezolvă pe cale amiabilă
        sau, în lipsă, de instanțele competente din România.
      </p>
      <p>
        Clienții persoane fizice se pot adresa Autorității Naționale pentru Protecția
        Consumatorilor, inclusiv pentru soluționarea alternativă a litigiilor —{" "}
        <a href={L.anpcSal} target="_blank" rel="noopener noreferrer">
          ANPC — SAL
        </a>{" "}
        — sau platformei europene de soluționare online a litigiilor —{" "}
        <a href={L.anpcSol} target="_blank" rel="noopener noreferrer">
          SOL
        </a>
        .
      </p>
    </LegalLayout>
  );
}
