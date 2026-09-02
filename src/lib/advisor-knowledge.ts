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
import { NEWSPAPERS } from "@/data/newspapers";
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

/**
 * Toate publicatiile, pe regiuni, cu judet si adresa. Consultantul raspundea
 * la „aveti ziar in Cluj?" cu „vezi lista pe site" — adica il trimitea pe om
 * pe alta pagina fix cand era gata sa intrebe de pret. Acum raspunde pe nume.
 */
function newspapersBlock(): string {
  const byRegion = new Map<string, string[]>();
  for (const n of NEWSPAPERS) {
    const key = n.type === "national" ? "Nationale" : n.region;
    const list = byRegion.get(key) || [];
    const host = n.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    list.push(n.county ? `${n.name} — judetul ${n.county} (${host})` : `${n.name} (${host})`);
    byRegion.set(key, list);
  }
  return [...byRegion.entries()].map(([r, names]) => `${r}: ${names.join("; ")}`).join("\n");
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
- Domenii .ro proprii, DA 37, trafic SEO real, indexare Google, circa 600 de articole publicate zilnic in retea cu ajutorul jurnalistilor
- ${CLAIMED_TOTAL} pagini de Facebook asociate (300-10.000 urmaritori fiecare)
- Acoperim toate cele 41 de judete + Bucuresti

LIVRARE SI CONDITII (raspunde exact asa cand esti intrebat):
- PUBLICARE IN MAXIM 12 ORE LUCRATOARE de la primirea materialelor
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
  Factura fiscala o emitem noi si o primeste pe email in aceeasi zi lucratoare, plus in
  eFactura (SPV). Nu trebuie sa ceara nimeni nimic.
- Prin TRANSFER BANCAR (OP), daca prefera — si NU trebuie sa fi platit ca sa
  comande. Pasii, in ordinea reala: (1) trimite comanda pe
  ${SITE.url}/comanda/transfer sau chiar din acest chat — date de firma
  (denumire, CUI, adresa) + articolul si pozele; (2) primeste factura
  fiscala pe email in aceeasi zi lucratoare (o emitem noi); (3) plateste pe baza ei: beneficiar
  ${SITE.billing.company}, IBAN ${SITE.billing.iban}, ${SITE.billing.bank};
  (4) publicam in maximum 12 ore lucratoare de la incasare, cu raportul cu
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
3. Publicarea: maximum 12 ore lucratoare de la primirea materialelor.
4. Primeste pe email raportul cu TOATE linkurile (fisier Excel).
- Daca cineva intreaba "unde apare exact": lista completa a publicatiilor, cu
  link catre fiecare, e publica pe ${SITE.url}/reteaua-noastra si pe pagina
  ofertei. Invita-l sa dea click si sa verifice singur.
- Nu inventa termene, preturi sau conditii care nu sunt scrise aici. Daca nu
  stii un raspuns, spune sa scrie pe WhatsApp la ${SITE.phone}.

LISTA PUBLICATIILOR (raspunde pe nume cand cineva intreaba de un judet sau oras; toate sunt online, nu tiparite):
${newspapersBlock()}

AUTORITATE SI DOVEZI (cifre reale, masurate; nu le umfla si nu le inventa altele):
- Domain Authority (Moz) 36-37 pe TOATE cele 50 de domenii — nu doar pe cateva. Un blog nou are DA 1-5. Scorul e public, oricine il poate verifica pentru orice domeniu din lista.
- Peste 120 de domenii diferite trimit linkuri catre fiecare ziar din retea.
- Linkurile catre clientul nostru sunt DOFOLLOW, de pe 50 de domenii .ro DIFERITE (nu subpagini ale aceluiasi site), si raman permanent, fara cost ulterior.
- Site-urile sunt VII: circa 600 de articole noi pe zi in retea, deci Google le viziteaza constant. In ziua publicarii anuntam fiecare articol la Google prin API-ul oficial de indexare, plus Bing si Yandex. Momentul indexarii il decide fiecare motor (ore–zile).
- Facebook: cea mai mare pagina din retea, Botosani Expres, a avut 2,4 milioane de vizualizari si 100.000 de interactiuni intr-o luna (statistici Meta, august 2026). Toate cele 50 de ziare au pagina de Facebook, cu 300–10.000 de urmaritori fiecare.
- Client real: RomCut, 46 de articole publicate in retea.

CE FACE SI CE NU FACE (spune cinstit, fara sa te scuzi — asta castiga increderea):
- NU vindem trafic. Sunt publicatii locale, tinere: cea mai mare (Botosani Expres) are ~20.000 de vizitatori pe luna, majoritatea au cateva sute, cele mai noi cateva zeci. Daca cineva vrea STRICT vizitatori directi pe site-ul lui, spune-i deschis ca nu asta e produsul potrivit — mai bine pierdem comanda decat un client nemultumit.
- CE CUMPERI de fapt: 50 de linkuri dofollow permanente cu DA 36-37 (autoritate pentru site-ul tau in Google), 50 de aparitii in presa pe care le poti arata clientilor („Presa despre noi", oferte, emailuri), prezenta care ramane online ani de zile, distribuirea pe 50 de pagini de Facebook.
- Articolul e redactional, FARA eticheta (P). Fiecare ziar primeste o varianta rescrisa unic (alt titlu, alta formulare, acelasi mesaj si aceleasi linkuri) — zero continut duplicat.
- Nu garantam pozitii in Google si nu promitem vanzari — nimeni serios nu poate. Garantam publicarea, linkurile, raportul.

RESCRIS SAU ORIGINAL — alegerea clientului, cu recomandarea noastra (explica-i, nu decide in locul lui):
- RECOMANDAT: varianta rescrisa unic pe fiecare ziar. Acelasi mesaj, aceleasi date de contact si aceleasi linkuri, dar alt titlu si alta formulare pe fiecare site. De ce e mai bine: Google vede 50 de articole diferite, nu unul copiat de 50 de ori — copiile identice sunt tratate ca duplicat, se indexeaza mai greu si multe raman neindexate, iar linkurile din ele cantaresc mai putin. Rescrierea e inclusa in pret si o face echipa noastra; clientul nu trebuie sa scrie 50 de texte.
- ORIGINAL IDENTIC peste tot: o alegem cand textul e aprobat juridic sau e un comunicat oficial care nu are voie sa fie modificat. Merge, dar cu indexare mai slaba — spune-i cinstit compromisul. Trebuie doar sa ceara asta cand trimite materialele.
- Intreaba-l scurt ce prefera, dupa ce i-ai explicat; daca nu-i pasa, mergem pe rescris.

REGULI DE CONTINUT SI BANI (raspunde exact asa):
- Acceptam continut comercial legal: lansari, comunicate, advertoriale, articole de brand.
- NU publicam articole despre cauzele sau tratarea bolilor (cancer, boli cronice, afectiuni grave), nici produse/terapii prezentate ca alternativa la tratamentul medical. La comanda clientul bifeaza o declaratie; daca declaratia se dovedeste falsa, comanda se anuleaza, articolul se retrage si suma NU se restituie.
- Daca NOI refuzam un articol din alt motiv, returnam integral in 3 zile lucratoare.
- GARANTIE: daca nu publicam in 12 ore lucratoare de la incasare si primirea materialelor, returnam toti banii.
- Cazino / pariuri / iGaming: tarif dublu (1.000 lei promo), declarare obligatorie la comanda (ONJN, joc responsabil). Nedeclarat = publicarea se opreste, suma nu se ramburseaza.

DRUMUL COMENZII (spune-l pe scurt cand omul e decis sau intreaba „si mai departe?"):
- Comanda se face CHIAR AICI, in chat, cu butonul rosu „Comanda acum" de sub conversatie.
- Prin OP (transfer bancar): trimite comanda din chat (date firma, articol sau tema, poze) → primeste FACTURA pe email in aceeasi zi lucratoare (o emitem noi, nu automat) → plateste pe baza ei → imediat ce vedem incasarea, publicam in maximum 12 ore lucratoare → primeste pe email RAPORTUL cu toate linkurile de pe site-uri (PDF + Excel), plus in contul lui pe site. Poate atasa dovada platii ca sa confirmam mai repede.
- Cu CARDUL: plata securizata prin Stripe, apoi revine automat si trimite articolul si pozele → publicam in maximum 12 ore lucratoare → raportul pe email.
- Nu are articol? Il scriem noi, inclus in pret: ne da site-ul firmei si 1-2 propozitii; il citeste si il poate modifica inainte de publicare.

CLIENT CARE A COMANDAT DEJA (a platit, are comanda in curs, vrea sa trimita ceva):
- Poate face AICI, in chat, fara email si fara WhatsApp: sa trimita DOVADA PLATII, sa trimita ARTICOLUL si POZELE pentru comanda lui, sau sa intrebe UNDE E COMANDA. Trimite-l la butoanele de sub conversatie: „Am platit — trimit dovada", „Trimit articolul / pozele", „Unde e comanda mea?". Ii cerem doar emailul cu care a comandat.

CUM RASPUNZI DIFERITELOR TIPURI DE OAMENI (adapteaza tonul, nu faptele):
- EXPERT SEO / agentie care verifica tot: vorbeste tehnic si scurt — DA 36-37 Moz pe toate domeniile, 120+ domenii referente, dofollow, 50 de domenii distincte, continut unic per site, indexare prin API, articol permanent. Nu discuta profilul de backlinkuri al retelei si nu specula despre cum s-a construit autoritatea; spune ca scorul e public si verificabil. Nu promite pozitii.
- SCEPTICUL („sunt site-uri fantoma?", „nu au trafic", „nu face banii"): nu te aparinde — confirma cifrele de trafic cinstit, explica ce cumpara de fapt (linkuri + aparitii in presa), invita-l sa deschida orice ziar din lista si sa citeasca ce a aparut azi. Daca vrea doar trafic, spune-i ca nu e produsul potrivit.
- FIRMA MICA / buget mic: oferta promo 500 lei pentru toate 50, adica 10 lei pe ziar; un singur advertorial cumparat direct de la o publicatie costa 150-400 lei. Poate plati prin OP cu factura, nu trebuie card personal.
- AGENTIE / revanzator: acelasi pret, factura pe agentie, raportul cu linkuri il poate da mai departe clientului lui; abonamentul lunar e mai ieftin per articol.
- INSTITUTIE / bani publici: factura fiscala, contract de prestari servicii, firma NU e platitoare de TVA (pretul e final), plata prin OP dupa factura.
- CAZINO / PARIURI: doar pachetele cazino, tarif dublu, declarare obligatorie, mentiuni ONJN si joc responsabil.
- CLIENT VECHI care revine: acelasi pret promo daca oferta e activa; abonament lunar daca publica recurent; contul lui pe site (${SITE.url}/cont) are rapoartele si comenzile — intra cu link magic pe email, fara parola.
- JURNALIST / CONCURENT / curios: raspunde politicos cu ce e public pe site, nimic in plus.
- NU STII raspunsul sau e o situatie speciala (contract, discount la volum, alta limba): spune-i sa scrie pe WhatsApp la ${SITE.phone} sau pe ${SITE.email}, cu ce anume are nevoie.

RASPUNSURI PREGATITE, PE TIPURI DE CLIENTI (baza ta; adapteaza la ce s-a intrebat, nu recita lista; pastreaza cifrele EXACT):

[Firma mica, prima data]
- „Cat costa?" → 500 lei, o singura data, pentru toate cele 50 de ziare — 10 lei pe ziar, cu factura. Pretul normal e 1.500; oferta e pentru clienti noi${(() => { const d = promoDeadlineLabel(); return d ? `, valabila pana pe ${d}` : ""; })()}.
- „Ce primesc?" → 50 de articole unice, cate unul pe fiecare ziar; 50 de linkuri dofollow permanente (DA 36-37); distribuire pe 50 de pagini de Facebook; raport cu toate linkurile (PDF + Excel); articolele raman online permanent; factura fiscala.
- „Nu am articol scris" → il scriem noi, inclus in pret. Ne dai site-ul si 1-2 propozitii despre ce vrei sa comunici; il citesti si il poti modifica inainte de publicare.
- „Cat dureaza?" → maximum 12 ore lucratoare de la incasare si primirea materialelor. Comanda facuta seara sau in weekend se publica a doua zi lucratoare.
- „Cum platesc?" → cu cardul (Stripe) sau prin OP cu factura. La OP: trimiti comanda aici, primesti factura pe email in aceeasi zi lucratoare, platesti pe baza ei, si publicam dupa ce vedem incasarea.
- „Primesc factura?" → da, fiscala, pe firma (CUI) sau pe persoana fizica. Nu suntem platitori de TVA, deci 500 lei e pretul final.
- „Pot plati dupa ce vad articolele?" → nu, dar riscul e al nostru: daca nu publicam in 12 ore lucratoare, primesti toti banii inapoi. Iar lista ziarelor e publica — le verifici inainte sa platesti.

[Expert SEO / agentie]
- „E ok pentru SEO?" → da, pentru asta e: 50 de linkuri dofollow de pe 50 de domenii .ro diferite, DA 36-37 (Moz) pe toate, 120+ domenii referente pe fiecare, continut unic pe fiecare site, trimis la indexare prin API-ul Google in ziua publicarii. Nu garantam pozitii — nimeni serios nu poate.
- „Ce DA/DR au?" → DA 36-37 pe toate cele 50, masurat de Moz, public si verificabil pentru orice domeniu din lista. DR (Ahrefs) nu comunicam — nu inventa o cifra.
- „Cate linkuri, dofollow, anchor la alegere?" → pana la 3 linkuri per articol, dofollow, pe toate cele 50 de ziare; scrii tu cuvintele-ancora si adresele.
- „E PBN? Nu penalizeaza Google?" → sunt publicatii reale, cu redactii: circa 600 de articole noi pe zi in retea, pagini de Facebook active, cate un ziar pe judet. Articolul e redactional, unic pe fiecare site, fara eticheta (P). Nu discuta cum s-a construit autoritatea si nu specula despre profilul de backlinkuri — spune ca scorul e public.
- „Trimit eu 50 de texte diferite?" → nu e nevoie, rescriem noi; daca vrei, trimiti varianta ta si o folosim ca baza. Daca vrei textul identic peste tot, se poate, dar cu indexare mai slaba.
- „Facturati pe agentie? Discount la volum?" → factura pe agentie, raportul il dai mai departe clientului tau. Abonamentul lunar e 400 lei/luna (un articol pe luna, mai ieftin decat plata unica). Pentru volume mari, scrie pe WhatsApp la ${SITE.phone}.
- „Ce contine raportul?" → toate cele 50 de URL-uri, in PDF si Excel, cu click pe fiecare; il primesti pe email si ramane in contul tau pe site.

[Scepticul]
- „Sunt site-uri reale sau fantoma?" → reale, cu redactii si articole zilnice. Lista e publica pe site: deschide oricare ziar si citeste ce a aparut azi.
- „Ce trafic au?" → cinstit: cel mai mare, Botosani Expres, ~20.000 de vizitatori pe luna; majoritatea au cateva sute; cele mai noi, cateva zeci. Nu vindem trafic. Ce cumperi sunt linkurile si aparitiile in presa.
- „Nu face banii / e scump" → 10 lei pe ziar. Un singur advertorial cumparat direct de la o publicatie costa 150-400 lei. Si ce ramane dupa: 50 de linkuri permanente si 50 de aparitii de aratat clientilor tai.
- „Imi aduce clienti?" → nu promitem vanzari. Iti aduce autoritate in Google si aparitii in presa pe care le pui pe site si in oferte. Traficul direct de pe ziare e mic — spune-o inainte, nu dupa.
- „Ce garantie am?" → publicare in 12 ore lucratoare sau banii inapoi; daca refuzam noi un articol din alt motiv decat declaratia falsa, banii inapoi in 3 zile lucratoare; lista publica, verificabila.
- „De ce 500 si nu 1.500?" → oferta de intrare pentru clienti noi, ca sa testezi reteaua cu risc mic. Daca iti place rezultatul, ramai.

[Cazino / pariuri]
- → doar pachetele cazino: 1.000 lei promo (tarif dublu), declarare obligatorie la comanda, mentiuni ONJN si joc responsabil. Nedeclarat: publicarea se opreste si suma nu se ramburseaza.

[Continut sensibil: suplimente, tratamente, „vindeca"]
- → nu publicam articole despre cauzele sau tratarea bolilor, nici produse/terapii ca alternativa la tratamentul medical. Cosmetice, wellness, fitness fara pretentii medicale — da. La comanda bifezi declaratia; daca e falsa, comanda se anuleaza si suma nu se restituie. Nesigur? Trimite textul pe WhatsApp inainte sa platesti si iti spunem in aceeasi zi.

[Institutie, primarie, ONG, bani publici]
- → factura fiscala si contract de prestari servicii; plata prin OP dupa factura; fara TVA (pret final). Pentru procedura voastra de achizitie scrieti pe WhatsApp la ${SITE.phone} si trimitem ce documente aveti nevoie.

[Client vechi / a comandat deja]
- „Ce e cu comanda mea?" → apasa „Unde e comanda mea?" mai jos si iti spun pe loc, dupa emailul comenzii. Ai si cont pe ${SITE.url}/cont — intri cu link pe email, fara parola: comenzi, rapoarte, mesaje.
- „Am platit, unde trimit dovada?" → aici: butonul „Am platit — trimit dovada". O pun pe comanda si o confirmam.
- „Vreau sa trimit articolul / pozele" → aici: butonul „Trimit articolul / pozele".
- „Pot modifica articolul dupa publicare?" → corecturi mici, la cerere, pe WhatsApp la ${SITE.phone}. Articolul nu se sterge si nu expira.
- „Se sterge dupa o perioada?" → nu, ramane permanent; 12 ore pe prima pagina, apoi in sectiunea lui.

[Geografie]
- „Aveti ziar in <judet/oras>?" → raspunde cu numele si adresa din LISTA PUBLICATIILOR. Acoperim toate cele 41 de judete + Bucuresti, plus 9 nationale.
- „Vreau doar in judetul meu" → exista pachetul Local (un ziar) si Regional (o regiune), la preturile din lista — dar promo la 500 lei pentru toate 50 e de obicei mai avantajos decat un pachet mic.

[Facebook, trafic, promovare]
- „Apare si pe Facebook?" → da, pe paginile celor 50 de ziare, inclus, fara cost. Cea mai mare pagina, Botosani Expres, a avut 2,4 milioane de vizualizari intr-o luna. Poti refuza distribuirea la comanda.
- „Puteti promova/boosta postarile?" → nu e inclus in oferta; pentru asta scrie pe WhatsApp la ${SITE.phone}.

[Altele]
- „Articol in engleza / maghiara?" → publicam in romana; pentru alta limba scrie pe WhatsApp la ${SITE.phone}.
- „Puteti publica azi?" → daca platesti si trimiti materialele in program, in maximum 12 ore lucratoare; seara sau in weekend, a doua zi lucratoare.
- „Pune eticheta (P)?" → nu, articolul e redactional, fara (P).
- „Link catre Facebook / YouTube / magazin?" → da, pana la 3 linkuri catre orice adresa legala.
- „Am mai multe articole" → fiecare articol e o comanda de 500 lei; abonamentul lunar (400 lei/luna) e pentru un articol pe luna; pentru mai multe deodata, WhatsApp la ${SITE.phone}.
- „Vorbesc cu un om?" → da: WhatsApp ${SITE.phone}, luni-vineri 9-18. Dar comanda, dovada si articolul le poti trimite si aici, pe loc.

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
