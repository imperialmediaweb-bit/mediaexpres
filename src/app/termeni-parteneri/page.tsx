import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { SITE } from "@/data/site";
import { ZILE_REFUZ, ZILE_PUBLICARE, LUNI_ONLINE } from "@/lib/plasari";
import { PRAG_RETRAGERE, ZILE_PLATA } from "@/lib/decont";
import { ZILE_REPARARE } from "@/lib/paza-linkuri";
import {
  TERMENI_VERSIUNE,
  ORE_REAMINTIRE,
  ZILE_FEREASTRA_ABATERI,
  ZILE_SUSPENDARE,
  ABATERI_SUSPENDARE,
  ABATERI_EXCLUDERE,
} from "@/lib/termene-parteneri";

export const metadata: Metadata = {
  title: "Acord de colaborare pentru parteneri",
  description: "Regulile colaborării dintre MediaExpres și publicațiile / influencerii parteneri: termene, plată, consecințe.",
  alternates: { canonical: "/termeni-parteneri" },
};

/*
  29.09.2026 — cerut de proprietar: „un contract cu ziarele: sa livreze la
  timp... termeni drastici daca nu publica". Nu amenzi (nu se incaseaza fara
  proces), ci consecinte pe care platforma le aplica singura — aceleasi cifre
  ca in cod: lib/termene-parteneri.ts, lib/paza-linkuri.ts, lib/decont.ts.
  Partenerul il bifeaza la inscriere; se salveaza versiunea, data si IP-ul.
  DE VERIFICAT DE UN AVOCAT inainte de folosire, mai ales punctul 8.
*/

const L = SITE.legal;
const h2 = "font-serif text-2xl font-bold text-brand-navy";

export default function TermeniParteneri() {
  return (
    <LegalLayout title="Acord de colaborare pentru parteneri" updated={`29 septembrie 2026 (versiunea ${TERMENI_VERSIUNE})`}>
      <h2 className={h2}>1. Părțile</h2>
      <p>
        <strong>{L.companyName}</strong>, CUI {L.cui}, {L.regCom}, {L.address} („MediaExpres”), și
        persoana sau firma care se înscrie ca partener pe {SITE.url.replace(/^https?:\/\//, "")} — publicație
        online sau creator de conținut („Partenerul”). Acordul se încheie electronic, prin bifarea lui la
        înscriere, și se aplică tuturor articolelor și postărilor primite prin platformă.
      </p>

      <h2 className={h2}>2. Ce face Partenerul</h2>
      <p>
        Pentru fiecare material primit, Partenerul îl refuză în {ZILE_REFUZ} zile lucrătoare (fără să
        explice de ce) sau îl publică în cel mult {ZILE_PUBLICARE} zile lucrătoare de la primire și lipește
        adresa în platformă. Materialul rămâne online cel puțin {LUNI_ONLINE} luni, la aceeași adresă, cu
        linkurile exact cum au fost cerute (dofollow, dacă Partenerul a declarat asta la înscriere) și fără
        a fi ascuns de motoarele de căutare (noindex). Influencerii marchează postarea ca publicitate,
        conform regulilor platformei pe care publică.
      </p>

      <h2 className={h2}>3. Ce face MediaExpres</h2>
      <p>
        Aduce clientul, încasează plata, trimite materialul, verifică publicarea și plătește Partenerului
        tariful acceptat, integral, pentru fiecare material publicat și păstrat conform punctului 2.
        Partenerul poate cere plata din contul lui de la {PRAG_RETRAGERE} de lei, pe bază de factură; plătim
        în {ZILE_PLATA} zile lucrătoare.
      </p>

      <h2 className={h2}>4. Verificarea</h2>
      <p>
        MediaExpres verifică automat, în fiecare săptămână, fiecare material publicat: că pagina există, că
        linkurile sunt acolo, că respectă ce s-a promis și că nu e ascunsă de Google. Partenerul primește cu{" "}
        {ORE_REAMINTIRE} ore înainte de termen o reamintire.
      </p>

      <h2 className={h2}>5. Dacă materialul nu e publicat la termen</h2>
      <p>
        La expirarea termenului de publicare, materialul se retrage automat de la Partener și se
        trimite altei publicații. Partenerul nu primește nimic pentru el, iar întârzierea se înregistrează
        ca abatere. Refuzul în termenul de la punctul 2 <strong>nu</strong> este abatere.
      </p>

      <h2 className={h2}>6. Dacă materialul e șters sau linkul modificat</h2>
      <p>
        Partenerul este anunțat și are {ZILE_REPARARE} zile să repare. Până atunci, suma pentru material nu
        poate fi cerută la plată. Dacă nu repară în termen, materialul se consideră nelivrat: se mută la
        altă publicație, se înregistrează o abatere, iar dacă suma fusese deja plătită sau cerută, se
        recuperează din următoarele plăți către Partener.
      </p>

      <h2 className={h2}>7. Abaterile</h2>
      <p>Abaterile se numără pe ultimele {ZILE_FEREASTRA_ABATERI} de zile:</p>
      <ul>
        <li>prima — avertisment scris;</li>
        <li>
          a {ABATERI_SUSPENDARE}-a — suspendare automată {ZILE_SUSPENDARE} de zile: Partenerul nu apare în
          catalog și nu primește materiale; revine automat după aceea;
        </li>
        <li>a {ABATERI_EXCLUDERE}-a — scoaterea din catalog.</li>
      </ul>
      <p>
        Materialele deja publicate și păstrate conform acordului se plătesc în continuare, inclusiv după
        suspendare sau scoatere.
      </p>

      <h2 className={h2}>8. Clienții MediaExpres</h2>
      <p>
        Comunicarea cu clientul se face doar prin platformă. Partenerul nu cere și nu transmite date de
        contact (telefon, email, site, rețele sociale) și nu oferă clientului, direct sau prin altcineva,
        servicii pe lângă MediaExpres, timp de 12 luni de la ultimul material primit de la acel client.
        Încălcarea acestui punct duce la scoaterea imediată din catalog; sumele pentru materialele
        clientului respectiv, încă neplătite, nu se mai datorează.
      </p>

      <h2 className={h2}>9. Conținutul</h2>
      <p>
        Materialele sunt ale clientului. Partenerul poate schimba forma (titlu, subtitluri, așezare), nu și
        conținutul sau linkurile. MediaExpres verifică materialele înainte de trimitere; Partenerul poate
        refuza oricând, în termen, un material care nu se potrivește publicației lui.
      </p>

      <h2 className={h2}>10. Datele și cifrele declarate</h2>
      <p>
        Partenerul declară că traficul, audiența și celelalte cifre date la înscriere sunt reale. Dacă se
        dovedesc false, MediaExpres poate schimba nivelul și tariful sau poate încheia colaborarea.
      </p>

      <h2 className={h2}>11. Încetarea și modificarea</h2>
      <p>
        Oricare parte poate încheia colaborarea oricând, cu un email. Materialele deja acceptate se
        publică și se plătesc conform acordului. MediaExpres poate actualiza acordul; versiunea nouă se
        aplică materialelor primite după ce Partenerul a fost anunțat pe email.
      </p>

      <h2 className={h2}>12. Legea și litigiile</h2>
      <p>
        Acordul se supune legii române. Părțile încearcă întâi rezolvarea amiabilă, pe email la{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>; în caz contrar, competente sunt instanțele de la
        sediul MediaExpres.
      </p>
    </LegalLayout>
  );
}
