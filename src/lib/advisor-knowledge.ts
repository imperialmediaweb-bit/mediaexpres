import {
  STANDARD_PACKAGES,
  CASINO_PACKAGES,
  PROMO_PACKAGES,
  SUBSCRIPTION_PLANS,
  PROMO_SUBSCRIPTION_PLANS,
  promoDeadlineLabel,
  type Package,
  type SubscriptionPlan,
} from "@/data/packages";
import { COUNTIES } from "@/data/counties";
import { SITE } from "@/data/site";

// Baza de cunostinte a consultantului, generata DIN datele reale ale platformei.
// Motivul: preturile si pachetele erau scrise de mana in promptul chatbotului si
// ramaneau in urma la fiecare modificare. Acum, cand schimbi un pret in
// data/packages.ts, consultantul stie noul pret imediat — fara sa atinga nimeni
// promptul.

function pkgLine(p: Package): string {
  return `- ${p.name}: ${p.price} RON - ${p.reach} (${p.newspapers} ${
    p.newspapers === 1 ? "publicatie" : "publicatii"
  })${p.badge ? ` [${p.badge}]` : ""}`;
}

function subLine(s: SubscriptionPlan): string {
  return `- ${s.name}: ${s.priceStandard} RON/luna standard, ${s.priceCasino} RON/luna cazino - ${s.description}`;
}

/** Regiunile cu judetele lor, pentru recomandarea pachetului Regional. */
function regionsBlock(): string {
  const byRegion = new Map<string, string[]>();
  for (const c of COUNTIES) {
    const list = byRegion.get(c.region) || [];
    list.push(c.name);
    byRegion.set(c.region, list);
  }
  return [...byRegion.entries()]
    .map(([region, names]) => `- ${region}: ${names.join(", ")}`)
    .join("\n");
}

// Reteaua are in date cateva publicatii peste ce promitem public (livram mai
// mult decat vindem). Consultantul comunica insa CIFRA OFICIALA, aceeasi de pe
// site, din contracte si din reclame — altfel clientul primeste doua numere
// diferite si isi pierde increderea.
const CLAIMED_TOTAL = 50;
const CLAIMED_LOCAL = 41;
const CLAIMED_NATIONAL = 9;

export function buildAdvisorKnowledge(): string {
  const promo = PROMO_PACKAGES.find((p) => p.id === "promo-50");
  const promoCasino = PROMO_PACKAGES.find((p) => p.id === "promo-50-cazino");
  const promoSub = PROMO_SUBSCRIPTION_PLANS[0];

  return `RETEAUA:
- ${CLAIMED_TOTAL} publicatii online proprii: ${CLAIMED_LOCAL} locale (cate 1 per judet) + ${CLAIMED_NATIONAL} nationale
- Domenii .ro proprii, DA 37, trafic SEO real, indexare Google
- ${CLAIMED_TOTAL} pagini de Facebook asociate (300-10.000 urmaritori fiecare)
- Acoperim toate cele 41 de judete + Bucuresti

LIVRARE SI CONDITII (raspunde exact asa cand esti intrebat):
- PUBLICARE IN MAXIM 24 DE ORE LUCRATOARE de la primirea materialelor
- ARTICOL UNIC PE FIECARE ZIAR (implicit): nu publicam copii identice — fiecare publicatie primeste o varianta rescrisa (alt titlu, alta formulare, acelasi mesaj si aceleasi linkuri). Zero continut duplicat. Daca clientul intreaba de "duplicate content" sau "canibalizare Google": canibalizarea e o problema doar intre paginile propriului site; articolele noastre sunt pe domeniile retelei si trimit linkuri catre clientul nostru
- EXCEPTIE la cerere: daca clientul vrea EXACT textul lui, neschimbat, in toate ziarele (comunicat oficial, text aprobat juridic etc.), publicam acelasi articol identic peste tot. Doar sa mentioneze asta cand trimite materialele
- Articolul ramane PERMANENT online - nu se sterge, backlinkurile raman active
- 12 ore pe prima pagina a fiecarei publicatii, apoi in sectiunea permanenta
- Pana la 3 poze incluse, una aleasa ca imagine reprezentativa
- Distribuirea pe Facebook e OPTIONALA, fara cost suplimentar
- Raport cu toate URL-urile, trimis pe email dupa publicare
- Articol redactional, FARA eticheta (P)
- Pana la 3 linkuri dofollow permanente catre site-ul clientului
- Factura fiscala; plata cu cardul online sau prin transfer bancar (OP)

PLATA SI FACTURA (raspunde concret, cu datele de mai jos — sunt reale):
- Cu CARDUL, online, pe ${SITE.url}/oferta-500 — plata securizata prin Stripe.
  Factura fiscala se emite AUTOMAT dupa plata si pleaca pe email, plus in
  eFactura (SPV). Nu trebuie sa ceara nimeni nimic.
- Prin TRANSFER BANCAR (OP), daca prefera — si NU trebuie sa fi platit ca sa
  comande. Pasii, in ordinea reala: (1) trimite comanda pe
  ${SITE.url}/comanda/transfer sau chiar din acest chat — date de firma
  (denumire, CUI, adresa) + articolul si pozele; (2) primeste AUTOMAT factura
  fiscala pe email; (3) plateste pe baza ei: beneficiar
  ${SITE.billing.company}, IBAN ${SITE.billing.iban}, ${SITE.billing.bank};
  (4) publicam in maximum 24 de ore lucratoare de la incasare, cu raportul cu
  toate linkurile. Dovada platii e OPTIONALA — o poate atasa doar ca sa
  grabim confirmarea; incasarea o vedem oricum in extras.
  ATENTIE: abonamentele lunare se platesc DOAR cu cardul (OP nu e recurent).
- Factura e pe firma ${SITE.billing.company}. Firma NU e platitoare de TVA,
  deci pe factura nu apare TVA — pretul afisat e pretul final.
- Se poate factura pe firma clientului (cu CUI) sau pe persoana fizica.

CE SE INTAMPLA DUPA PLATA CU CARDUL (la OP pasii sunt cei de mai sus):
1. Clientul e redirectionat catre un formular unde trimite articolul si pana
   la 3 poze (una aleasa ca imagine reprezentativa).
2. Daca NU are articol scris: da site-ul firmei + 1-2 propozitii despre ce
   vrea sa comunice, iar echipa il redacteaza. Il poate citi si modifica.
3. Publicarea: maximum 24 de ore lucratoare de la primirea materialelor.
4. Primeste pe email raportul cu TOATE linkurile (fisier Excel).
- Daca cineva intreaba "unde apare exact": lista completa a publicatiilor, cu
  link catre fiecare, e publica pe ${SITE.url}/reteaua-noastra si pe pagina
  ofertei. Invita-l sa dea click si sa verifice singur.
- Nu inventa termene, preturi sau conditii care nu sunt scrise aici. Daca nu
  stii un raspuns, spune sa scrie pe WhatsApp la ${SITE.phone}.

PACHETE STANDARD (plata unica):
${STANDARD_PACKAGES.map(pkgLine).join("\n")}

PACHETE CAZINO / iGAMING (conform ONJN, cu mentiune joc responsabil):
${CASINO_PACKAGES.map(pkgLine).join("\n")}

ABONAMENTE LUNARE (pret per articol mai mic decat plata unica):
${SUBSCRIPTION_PLANS.map(subLine).join("\n")}

OFERTA PROMO ACTIVA (arma de inchidere cand clientul ezita pe pret)${(() => {
    const d = promoDeadlineLabel();
    return d ? ` — VALABILA PANA PE ${d.toUpperCase()}, foloseste termenul ca urgenta reala` : "";
  })()}:
- ${promo?.name}: ${promo?.price} RON o singura data - EXACT acelasi lucru ca pachetul National 50 (${
    STANDARD_PACKAGES.find((p) => p.id === "national")?.price
  } RON), la pret de intrare pentru clienti NOI. Adica ${Math.round(
    (promo?.price ?? 500) / (promo?.newspapers ?? 50),
  )} lei pe ziar.
- Abonament promo lunar: ${promoSub?.priceStandard} RON/luna - 1 articol x ${
    promoSub?.newspapersPerDistribution
  } ziare in FIECARE luna. Mai ieftin decat plata unica. Se anuleaza oricand din cont.
- Varianta cazino: ${promoCasino?.price} RON o data sau ${
    promoSub?.priceCasino
  } RON/luna (tarif dublu, declarare obligatorie)
- Pagina: /oferta-500
- CAND o oferi: clientul spune ca e scump, compara preturi, e client NOU sau vrea sa testeze reteaua. NU o oferi din prima daca clientul e deja decis pe un pachet mai mare.

REGIUNI (pentru pachetul Regional):
${regionsBlock()}

REDACTAREA ARTICOLULUI:
- Clientul poate trimite textul lui SAU echipa noastra il redacteaza
- Are nevoie doar de 1-2 propozitii cu tematica + site-ul firmei + pana la 3 poze
- Citim site-ul firmei ca sa scriem cu informatii reale despre ei
- Articolul e optimizat SEO si poate fi editat de client inainte de publicare`;
}
