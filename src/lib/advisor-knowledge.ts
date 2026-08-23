import {
  STANDARD_PACKAGES,
  CASINO_PACKAGES,
  PROMO_PACKAGES,
  SUBSCRIPTION_PLANS,
  PROMO_SUBSCRIPTION_PLANS,
  type Package,
  type SubscriptionPlan,
} from "@/data/packages";
import { COUNTIES } from "@/data/counties";

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
- PUBLICARE IN MAXIM 4 ORE LUCRATOARE de la primirea materialelor
- Articolul ramane PERMANENT online - nu se sterge, backlinkurile raman active
- 12 ore pe prima pagina a fiecarei publicatii, apoi in sectiunea permanenta
- Pana la 3 poze incluse, una aleasa ca imagine reprezentativa
- Distribuirea pe Facebook e OPTIONALA, fara cost suplimentar
- Raport cu toate URL-urile, trimis pe email dupa publicare
- Articol redactional, FARA eticheta (P)
- Pana la 3 linkuri dofollow permanente catre site-ul clientului
- Factura fiscala; plata cu cardul online sau prin transfer

PACHETE STANDARD (plata unica):
${STANDARD_PACKAGES.map(pkgLine).join("\n")}

PACHETE CAZINO / iGAMING (conform ONJN, cu mentiune joc responsabil):
${CASINO_PACKAGES.map(pkgLine).join("\n")}

ABONAMENTE LUNARE (pret per articol mai mic decat plata unica):
${SUBSCRIPTION_PLANS.map(subLine).join("\n")}

OFERTA PROMO ACTIVA (arma de inchidere cand clientul ezita pe pret):
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
