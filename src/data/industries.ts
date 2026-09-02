// Pagini SEO programatice pe industrii: /comunicate-presa-{slug}.
// Tintesc cautari comerciale ("comunicat de presa imobiliare", "PR clinica" etc.)
// pe care ranca competitorii mari. Continutul e UNIC per industrie — Google
// penalizeaza sabloanele subtiri, asa ca fiecare intrare are copy propriu.

export interface IndustryFaq {
  q: string;
  a: string;
}

export interface Industry {
  slug: string;
  /** Numele industriei, forma naturala ("imobiliare", "clinici medicale"). */
  name: string;
  /** Titlul H1 al paginii. */
  heading: string;
  metaTitle: string;
  metaDescription: string;
  /** 2 paragrafe de introducere, specifice industriei. */
  intro: [string, string];
  /** De ce functioneaza presa pentru industria asta. */
  reasons: { title: string; text: string }[];
  /** Idei concrete de articole — arata ca stim domeniul. */
  exampleTopics: string[];
  faq: IndustryFaq[];
  keywords: string[];
}

export const INDUSTRIES: Industry[] = [
  {
    slug: "imobiliare",
    name: "imobiliare",
    heading: "Comunicate de presă pentru imobiliare",
    metaTitle: "Comunicate de presă imobiliare — publicare în 50 de ziare",
    metaDescription:
      "Promovează ansambluri rezidențiale, agenții și proiecte imobiliare în presa din toată România. Publicare în 12 ore lucrătoare, raport cu linkuri. De la 150 RON.",
    intro: [
      "Un ansamblu rezidențial se vinde greu doar din anunțuri pe portaluri. Cumpărătorul unei locuințe caută semnale de încredere: cine e dezvoltatorul, ce a mai construit, ce spun sursele independente. Un articol în presa locală și națională e exact genul de validare pe care OLX-ul nu ți-l poate da.",
      "MediaExpres publică articolul tău în ziarele din județul unde vinzi — plus, la nevoie, în toată țara. Cumpărătorii care caută pe Google numele proiectului tău găsesc presă, nu doar reclame.",
    ],
    reasons: [
      { title: "Încredere la achiziția vieții", text: "Nimeni nu dă 100.000 € pe baza unui banner. Articolele de presă construiesc legitimitatea dezvoltatorului." },
      { title: "SEO pe numele proiectului", text: "50 de backlinks către site-ul proiectului urcă paginile tale în căutările de tip „ansamblu rezidențial + oraș\"." },
      { title: "Țintire locală exactă", text: "Vinzi în Cluj? Publici în presa din Cluj. Cumpărătorii de locuințe caută aproape întotdeauna local." },
      { title: "Material pentru agenți", text: "Echipa de vânzări trimite clienților linkuri de presă, nu PDF-uri de prezentare." },
    ],
    exampleTopics: [
      "Lansarea unei noi faze a ansamblului, cu prețuri și termen de finalizare",
      "Stadiul lucrărilor — fotoreportaj de pe șantier",
      "Analiză: cât costă o garsonieră în orașul X în 2026",
      "Parteneriat cu o bancă pentru credite ipotecare avantajoase",
      "Predarea primelor chei — poveștile primilor locatari",
    ],
    faq: [
      { q: "Pot promova un singur apartament sau doar proiecte mari?", a: "Orice: de la un penthouse premium la un ansamblu de 500 de unități. Pentru proprietăți individuale recomandăm pachetul Local (150 RON), pentru ansambluri pachetul Național cu 50 de ziare." },
      { q: "Pot include prețurile și datele de contact în articol?", a: "Da. Articolul e advertorial — include prețuri, telefon, link către site și până la 3 fotografii ale proiectului." },
      { q: "Cât durează publicarea?", a: "Maximum 12 ore lucrătoare de la trimiterea materialelor. Primești raportul cu toate linkurile pe email." },
    ],
    keywords: ["comunicat presa imobiliare", "promovare ansamblu rezidential", "PR dezvoltator imobiliar", "advertorial imobiliare", "publicitate proiect imobiliar"],
  },
  {
    slug: "clinici-medicale",
    name: "clinici și cabinete medicale",
    heading: "Comunicate de presă pentru clinici și cabinete medicale",
    metaTitle: "PR pentru clinici medicale — articole în presa din toată țara",
    metaDescription:
      "Adu pacienți noi cu articole în presa locală: medici noi, aparatură modernă, servicii unice în județ. Publicare în 12 ore lucrătoare, conform reglementărilor.",
    intro: [
      "Pacienții nu aleg clinica din bannere — o aleg pe cea despre care au citit, pe care le-a recomandat-o cineva, sau care apare în presă ca autoritate locală. Un medic citat într-un articol despre prevenție valorează mai mult decât zece reclame.",
      "Publicăm articole despre clinica ta în ziarele din județ și din țară: aparatura nouă, medicii care s-au alăturat echipei, campaniile de screening. Ton editorial, credibil, fără promisiuni medicale interzise de lege.",
    ],
    reasons: [
      { title: "Autoritate medicală locală", text: "Clinica menționată constant în presă devine reflexul „acolo mă duc\" al orașului." },
      { title: "Pacienții caută pe Google", text: "„Cardiolog + orașul tău\" — articolele cu backlink urcă site-ul clinicii exact pe astfel de căutări." },
      { title: "Conform cu reglementările", text: "Redactăm în limitele publicității medicale: informativ, fără promisiuni de vindecare, fără comparații interzise." },
      { title: "Recrutare de medici", text: "Clinicile vizibile în presă atrag mai ușor specialiști buni — și ei citesc despre angajatori." },
    ],
    exampleTopics: [
      "Clinica X aduce primul RMN 3 Tesla din județ",
      "Interviu: noul medic cardiolog al clinicii despre prevenția la 40+",
      "Campanie gratuită de screening — locuri limitate",
      "5 semne că trebuie să mergi la control — sfaturile specialiștilor clinicii",
      "Clinica X deschide punct de recoltare în cartierul Y",
    ],
    faq: [
      { q: "Respectați regulile de publicitate pentru serviciile medicale?", a: "Da. Articolele sunt informative, fără promisiuni de vindecare sau statistici nefondate — genul de conținut acceptat pentru domeniul medical în presa românească." },
      { q: "Putem publica lunar?", a: "Da, cu abonamentul lunar aveți câte un articol în fiecare lună — ideal pentru clinici care vor prezență constantă: medici noi, campanii sezoniere, educație medicală." },
      { q: "Articolul poate promova un singur medic?", a: "Da — profilurile de medic (specializare, experiență, program) sunt printre cele mai citite formate din presa locală." },
    ],
    keywords: ["comunicat presa clinica medicala", "PR cabinet medical", "promovare clinica", "publicitate servicii medicale", "articole presa medici"],
  },
  {
    slug: "avocati-juridic",
    name: "cabinete de avocatură",
    heading: "Comunicate de presă pentru avocați și case de avocatură",
    metaTitle: "PR juridic — vizibilitate în presă pentru cabinete de avocatură",
    metaDescription:
      "Poziționează-te ca autoritate juridică: comentarii pe legislație nouă, ghiduri pentru public, prezentarea echipei. Publicare în 50 de ziare în 12 ore lucrătoare.",
    intro: [
      "Clienții nu compară avocații pe preț — îl caută pe cel care pare că știe. Iar „pare că știe\" se construiește public: avocatul citat în presă pe o schimbare de lege devine prima opțiune când cititorul are o problemă juridică.",
      "Publicăm analize și ghiduri semnate de cabinetul tău în presa locală și națională. Publicitatea directă e restricționată pentru avocați — dar conținutul editorial de informare juridică este exact instrumentul permis și eficient.",
    ],
    reasons: [
      { title: "Autoritate, nu reclamă", text: "Formatul editorial respectă restricțiile de publicitate ale profesiei — informezi publicul, nu te lauzi." },
      { title: "Clientul potrivit te găsește", text: "Cine citește analiza ta despre moșteniri are, de multe ori, chiar o problemă de moștenire." },
      { title: "SEO pe domenii de practică", text: "„Avocat divorț + oraș\" — articolele cu backlink împing site-ul cabinetului pe primele poziții." },
      { title: "Arhivă de credibilitate", text: "Linkurile de presă rămân permanent — un portofoliu public pe care îl arăți clienților corporate." },
    ],
    exampleTopics: [
      "Ce se schimbă pentru chiriași odată cu noua lege — explicat de avocat",
      "Ghid: pașii unui divorț cu copii în 2026",
      "Cabinetul X își extinde echipa cu doi avocați de drept comercial",
      "Drepturile angajatului concediat — 7 lucruri de știut",
      "Interviu: cum îți protejezi firma de clauze abuzive în contracte",
    ],
    faq: [
      { q: "Publicitatea pentru avocați nu e interzisă?", a: "Publicitatea agresivă da, conținutul de informare juridică nu. Articolele noastre sunt educative — formatul folosit de toate casele mari de avocatură din România." },
      { q: "Putem semna articolul cu numele avocatului?", a: "Da, recomandat chiar — numele și fotografia avocatului construiesc brandul personal care aduce clienți." },
      { q: "Cât de repede apare articolul?", a: "În 12 ore lucrătoare pe toate publicațiile alese, cu raport complet cu linkuri." },
    ],
    keywords: ["PR avocat", "comunicat presa cabinet avocatura", "promovare avocat", "articole juridice presa", "marketing juridic"],
  },
  {
    slug: "it-startup",
    name: "IT și startup-uri",
    heading: "Comunicate de presă pentru startup-uri și companii IT",
    metaTitle: "PR pentru startup-uri — lansări și finanțări în presa din România",
    metaDescription:
      "Lansezi un produs, ai închis o rundă de finanțare, angajezi masiv? Publicăm știrea în 50 de ziare în 12 ore lucrătoare — vizibilitate pentru clienți și investitori.",
    intro: [
      "În tech, presa nu e vanitate — e due diligence. Investitorii care îți primesc pitch-ul te caută pe Google. Clienții enterprise la fel. Candidații seniori la fel. Dacă nu găsesc nimic, pari mai mic decât ești.",
      "Publicăm lansările, rundele de finanțare și milestone-urile tale în presa din toată țara. Un layer de legitimitate pe care îl construiești cu un articol pe lună, nu cu ani de așteptat să te remarce un jurnalist.",
    ],
    reasons: [
      { title: "Due diligence favorabil", text: "Investitorii și clienții B2B verifică presa înainte de orice semnătură. Fii găsibil." },
      { title: "Recrutare tech", text: "Developerii buni aleg firme despre care se aude. Articolele de angajări aduc CV-uri." },
      { title: "Backlinks pentru domain authority", text: "50 de linkuri dofollow din domenii .ro cu DA 37+ — fundația SEO pe care produsul tău crește organic." },
      { title: "Momentum public", text: "Fiecare milestone publicat devine muniție pentru următorul pitch, următorul client, următoarea rundă." },
    ],
    exampleTopics: [
      "Startup-ul X ridică o finanțare de Y € pentru extinderea în Europa",
      "Lansare: aplicația care rezolvă problema Z pentru firmele românești",
      "Compania X angajează 20 de developeri în orașul Y",
      "Parteneriat strategic cu un jucător internațional",
      "Studiu propriu: cum folosesc IMM-urile românești AI-ul în 2026",
    ],
    faq: [
      { q: "Presa națională sau doar locală?", a: "Pachetul Național include 9 publicații naționale + 41 locale. Pentru tech recomandăm Naționalul — audiența ta e distribuită." },
      { q: "Puteți scrie voi articolul în limbaj accesibil?", a: "Da — descrii produsul în câteva fraze, iar redactorul nostru AI scrie articolul pe înțelesul publicului larg, fără jargon. Îl editezi înainte de publicare." },
      { q: "Ajută la SEO pentru un SaaS?", a: "Direct: 50 de backlinks permanente din domenii distincte. E genul de profil de linkuri pe care agențiile îl vând cu mii de euro." },
    ],
    keywords: ["PR startup Romania", "comunicat presa lansare produs", "comunicat finantare startup", "PR companie IT", "promovare aplicatie presa"],
  },
  {
    slug: "ecommerce",
    name: "magazine online",
    heading: "Comunicate de presă pentru magazine online",
    metaTitle: "PR pentru eCommerce — trafic și backlinks din 50 de ziare",
    metaDescription:
      "Crește autoritatea magazinului tău online: lansări de gamă, campanii sezoniere, povestea brandului. 50 de backlinks dofollow + trafic real. De la 150 RON.",
    intro: [
      "În eCommerce, bătălia se dă pe Google. Iar Google clasează magazinele cu autoritate — adică profil de backlinks din surse credibile. Presa e cea mai naturală sursă de astfel de linkuri: 50 de articole în 50 de ziare înseamnă 50 de domenii distincte care garantează pentru tine.",
      "Dincolo de SEO: cumpărătorii verifică magazinele necunoscute înainte să lase datele cardului. Articolele de presă sunt exact dovada de legitimitate care transformă vizitatorul sceptic în client.",
    ],
    reasons: [
      { title: "Backlinks care mută serios", text: "50 de linkuri dofollow din domenii .ro diferite — cel mai eficient raport preț/autoritate din piață." },
      { title: "Încredere = conversie", text: "Magazinul menționat în presă convertește mai bine: scepticismul la primul checkout scade." },
      { title: "Campanii sezoniere amplificate", text: "Black Friday, Crăciun, reduceri de vară — articolul de presă prinde valul de căutări la timp." },
      { title: "Povestea brandului", text: "Fondatorii cu poveste vând mai mult decât cataloagele de produse. Presa spune povești." },
    ],
    exampleTopics: [
      "Magazinul X lansează gama de produse Y — primele din România",
      "Povestea antreprenorului care a pornit magazinul din garaj",
      "Studiu pe datele proprii: ce cumpără românii de sărbători",
      "Extinderea livrării în toată țara / deschiderea unui showroom",
      "Campania de Black Friday: ce reduceri pregătește magazinul X",
    ],
    faq: [
      { q: "Pot pune linkuri către paginile de produs?", a: "Da, până la 3 linkuri per articol — către homepage, categorie sau produs. Toate dofollow, permanente." },
      { q: "Cât de repede se văd efectele SEO?", a: "Linkurile se indexează în zile, efectul în ranking se acumulează în săptămâni. De aceea abonamentul lunar bate one-shot-ul: profil de linkuri care crește constant." },
      { q: "Merge și pentru marketplace-uri mici sau doar magazine mari?", a: "Orice magazin cu produs real. Pentru început recomandăm un articol de brand + unul de campanie sezonieră." },
    ],
    keywords: ["backlinks magazin online", "PR ecommerce Romania", "promovare magazin online presa", "comunicat presa lansare produs", "SEO magazin online"],
  },
  {
    slug: "restaurante-horeca",
    name: "restaurante și HoReCa",
    heading: "Comunicate de presă pentru restaurante, cafenele și hoteluri",
    metaTitle: "PR HoReCa — restaurantul tău în presa locală în 12 ore lucrătoare",
    metaDescription:
      "Deschidere de local, meniu nou, chef premiat? Publică în ziarele orașului tău și umple mesele. Articole cu poze, de la 150 RON, publicate în 12 ore lucrătoare.",
    intro: [
      "Un local nou are 6 luni să devină „locul acela despre care se vorbește\" — sau rămâne gol. Presa locală e acceleratorul: articolul despre deschidere ajunge exact la publicul din oraș care caută un loc nou de încercat.",
      "Publicăm în ziarele din județul tău articole cu care te lauzi apoi pe Instagram: deschiderea, meniul de sezon, chef-ul, evenimentele. Cu fotografii care fac poftă.",
    ],
    reasons: [
      { title: "Publicul din oraș, nu din țară", text: "Pachetul Local publică fix în presa citită de oamenii care pot ajunge la tine la cină." },
      { title: "Google Maps + recenzii", text: "Clienții caută „restaurant + oraș\" — articolele cu link întăresc prezența ta în rezultatele locale." },
      { title: "Conținut pentru social media", text: "„Scriu ziarele despre noi\" — screenshot-ul articolului e cea mai bună postare de Instagram." },
      { title: "Evenimente pline", text: "Degustări, seri tematice, brunch-uri — anunțate în presă, se umplu din rezervări." },
    ],
    exampleTopics: [
      "S-a deschis X — localul care aduce bucătăria Y în orașul Z",
      "Chef-ul restaurantului X, premiat la competiția Y",
      "Meniul de sezon: ce gătește X cu ingrediente de la producători locali",
      "Brunch-ul de duminică — noua tradiție a orașului",
      "Localul X lansează terasa de vară cu un eveniment special",
    ],
    faq: [
      { q: "Pot publica doar în orașul meu?", a: "Da — pachetul Local (150 RON) publică în ziarul județului tău. Exact publicul care îți poate deveni client." },
      { q: "Pot include poze cu preparatele?", a: "Da, până la 3 fotografii per articol — iar la HoReCa pozele fac jumătate din treabă." },
      { q: "Cât de des ar trebui să public?", a: "Localurile active apar lunar în presă: meniu nou, eveniment, sezon nou. Abonamentul lunar acoperă exact ritmul ăsta." },
    ],
    keywords: ["promovare restaurant presa", "PR restaurant", "comunicat deschidere local", "publicitate restaurant oras", "promovare hotel presa"],
  },
  {
    slug: "constructii",
    name: "construcții și amenajări",
    heading: "Comunicate de presă pentru firme de construcții și amenajări",
    metaTitle: "PR construcții — proiectele tale în presa din toată România",
    metaDescription:
      "Câștigă licitații și clienți mari: firmele de construcții vizibile în presă inspiră încredere. Publicare proiecte, echipamente, angajări — în 12 ore lucrătoare.",
    intro: [
      "În construcții, contractele mari se dau firmelor care par solide. Iar soliditatea se demonstrează public: proiecte finalizate în presă, echipamente noi, echipe în creștere. Beneficiarul care te caută pe Google înainte de licitație trebuie să găsească dovezi, nu doar site-ul tău.",
      "Publicăm portofoliul tău ca știri: lucrarea predată la termen, utilajul nou din flotă, șantierul deschis. Fiecare articol e o referință publică permanentă.",
    ],
    reasons: [
      { title: "Dosar public de referințe", text: "Articolele despre proiectele finalizate sunt referințe verificabile — aur la licitații private și publice." },
      { title: "Încredere pentru avansuri", text: "Clientul care plătește avans 30% vrea o firmă cu urmă publică, nu un SRL fantomă." },
      { title: "Recrutare de meseriași", text: "Criza de forță de muncă se câștigă cu vizibilitate: firmele cunoscute primesc CV-uri." },
      { title: "Prezență județeană", text: "Lucrezi în 3 județe? Publici în presa fiecăruia — pachetul Regional acoperă zona întreagă." },
    ],
    exampleTopics: [
      "Firma X a finalizat ansamblul Y cu două luni înainte de termen",
      "Investiție de Z € în utilaje noi — ce poate construi acum firma X",
      "Firma X angajează 30 de muncitori calificați în județul Y",
      "Cum se construiește o casă pasivă — explicat de constructorul X",
      "Firma X, partener în proiectul de renovare a școlii din Y",
    ],
    faq: [
      { q: "Ajută la licitații publice?", a: "Direct nu — dar comisiile și beneficiarii verifică reputația publică a ofertanților, iar presa e prima pagină de Google la numele firmei tale." },
      { q: "Putem publica poze de pe șantier?", a: "Da, până la 3 fotografii — înainte/după și progresul lucrărilor sunt formate care se citesc foarte bine." },
      { q: "În ce județe puteți publica?", a: "În toate 41 + București — câte un ziar per județ, plus 9 publicații naționale la pachetul Național." },
    ],
    keywords: ["PR firma constructii", "promovare firma constructii", "comunicat presa constructii", "publicitate constructii", "promovare firma amenajari"],
  },
  {
    slug: "auto",
    name: "auto și service-uri",
    heading: "Comunicate de presă pentru dealeri auto și service-uri",
    metaTitle: "PR auto — dealeri, service-uri și parcuri auto în presă",
    metaDescription:
      "Lansări de modele, oferte de sezon, service-uri autorizate — publicate în ziarele din județul tău în 12 ore lucrătoare. Adu clienți în showroom cu presa locală.",
    intro: [
      "Mașina e a doua cea mai mare achiziție a unei familii — și se cumpără local. Clientul care intră în showroom a citit înainte: despre model, despre dealer, despre ofertele momentului. Presa județeană e canalul care îl aduce pe ușă.",
      "Publicăm lansările, ofertele și serviciile tale în presa din zona de unde vin clienții. De la dealeri de mărci noi la parcuri de rulate și service-uri specializate.",
    ],
    reasons: [
      { title: "Achiziție locală prin excelență", text: "Nimeni nu traversează țara pentru un service. Presa județeană țintește fix raza ta de acțiune." },
      { title: "Momente de vânzare", text: "Lansarea noului model, ofertele de primăvară, rabla — fiecare campanie amplificată la timp." },
      { title: "Încredere la rulate", text: "Parcurile auto trăiesc din reputație. Articolele de presă separă dealerul serios de piața gri." },
      { title: "Servicii cu bilet mediu mare", text: "ITP, geometrie, ADAS, retrofit — serviciile tehnice explicate în presă aduc programări." },
    ],
    exampleTopics: [
      "Noul model X a ajuns în showroom-ul din orașul Y — prețuri și dotări",
      "Service-ul X devine autorizat pentru marca Y — singurul din județ",
      "Ghid: cum verifici o mașină rulată înainte de cumpărare",
      "Ofertă de sezon: schimbul de anvelope + verificare gratuită",
      "Parcul auto X garantează istoricul fiecărei mașini — iată cum",
    ],
    faq: [
      { q: "Pot promova oferte cu preț și termen limită?", a: "Da — advertorialele cu ofertă concretă („până pe 30 iunie\") sunt printre cele mai eficiente formate auto." },
      { q: "Publicați și pentru service-uri mici?", a: "Da, pachetul Local de 150 RON e gândit exact pentru afaceri de cartier — un articol bun în ziarul județului." },
      { q: "Cât durează de la comandă la publicare?", a: "12 ore lucrătoare, cu raport pe email cu toate linkurile." },
    ],
    keywords: ["promovare dealer auto", "PR service auto", "comunicat presa auto", "publicitate parc auto", "promovare service presa"],
  },
  {
    slug: "educatie",
    name: "educație și training",
    heading: "Comunicate de presă pentru școli private, grădinițe și cursuri",
    metaTitle: "PR educație — școli, grădinițe și furnizori de cursuri în presă",
    metaDescription:
      "Umple locurile la înscrieri: părinții aleg școlile despre care citesc. Articole despre rezultate, profesori, programe — publicate în 12 ore lucrătoare în presa locală.",
    intro: [
      "Părinții nu aleg grădinița din pliante — o aleg pe cea despre care au citit lucruri bune și pe care o recomandă alți părinți. Presa locală e locul unde se formează exact această reputație, cu luni înainte de perioada de înscrieri.",
      "Publicăm articole despre rezultatele elevilor tăi, programele speciale, profesorii remarcabili. Când vine sesiunea de înscrieri, numele instituției e deja cunoscut și asociat cu performanța.",
    ],
    reasons: [
      { title: "Decizie emoțională, validare publică", text: "Educația copilului e subiect sensibil — părinții caută dovezi publice de seriozitate." },
      { title: "Calendarul înscrierilor", text: "Articolele publicate în februarie-aprilie prind exact fereastra în care părinții compară opțiunile." },
      { title: "Rezultatele vând", text: "Promovabilitate, olimpici, admiteri — cifrele publicate în presă valorează cât zece târguri educaționale." },
      { title: "Cursuri pentru adulți", text: "Reconversie, IT, limbi străine — cursanții adulți caută furnizori credibili, iar presa filtrează." },
    ],
    exampleTopics: [
      "Elevii școlii X, rezultate de top la evaluarea națională",
      "Grădinița X deschide grupă cu predare în engleză — înscrieri deschise",
      "Interviu cu directorul: cum arată educația alternativă în orașul Y",
      "Centrul X lansează curs de programare pentru copii de la 8 ani",
      "Poveste de succes: cursantul care și-a schimbat cariera la 40 de ani",
    ],
    faq: [
      { q: "Când e cel mai bun moment să publicăm?", a: "Cu 2-3 luni înainte de înscrieri — februarie-aprilie pentru toamnă. Iar abonamentul lunar menține prezența tot anul." },
      { q: "Putem publica testimoniale de la părinți?", a: "Da, cu acordul lor — poveștile autentice ale părinților sunt cel mai convingător format." },
      { q: "Publicați și pentru afterschool-uri și meditații?", a: "Da — orice furnizor de educație, de la grădinițe la academii de programare pentru adulți." },
    ],
    keywords: ["promovare scoala privata", "PR gradinita", "comunicat presa educatie", "promovare cursuri", "publicitate afterschool"],
  },
  {
    slug: "frumusete-wellness",
    name: "beauty și wellness",
    heading: "Comunicate de presă pentru saloane, clinici estetice și spa",
    metaTitle: "PR beauty — saloane și clinici estetice în presa locală",
    metaDescription:
      "Clientele noi vin din încredere: publică în presa orașului deschiderea, aparatura nouă, specialiștii tăi. Articole cu poze, publicate în 12 ore lucrătoare.",
    intro: [
      "În beauty, clienta nouă vine pe recomandare — sau pe reputație publică. Între două saloane cu prețuri identice, câștigă cel despre care a citit ceva: aparatura de ultimă generație, specialista cu certificări, transformările reale.",
      "Publicăm în presa orașului tău articolele care construiesc exact această reputație. Iar linkurile rămân permanent — oricine caută numele salonului găsește presă, nu doar Instagram.",
    ],
    reasons: [
      { title: "Încredere pentru proceduri", text: "La injectări, lasere și tratamente corporale, clienta vrea dovezi de profesionalism înainte de programare." },
      { title: "Local prin definiție", text: "Nimeni nu face 200 km pentru manichiură. Presa județeană țintește raza reală de clientelă." },
      { title: "Diferențiere de piața gri", text: "Articolele cu certificările și aparatura ta te separă public de garsoniera cu aparat de AliExpress." },
      { title: "Momente de sezon", text: "Pregătirea de vară, pachetele de sărbători, ofertele de Black Friday — amplificate la timp." },
    ],
    exampleTopics: [
      "Clinica X aduce primul laser Y din județ — ce probleme rezolvă",
      "Interviu cu fondatoarea: de la un scaun închiriat la salonul cu 10 angajate",
      "Ghid: cum alegi o clinică estetică sigură — criteriile specialiștilor",
      "Salonul X lansează pachetul de mireasă — ce include",
      "Transformări reale: poveștile clientelor (cu acordul lor)",
    ],
    faq: [
      { q: "Putem promova proceduri estetice injectabile?", a: "Da, în limitele legale: informativ, efectuate de personal medical calificat, fără promisiuni de rezultat garantat." },
      { q: "Pozele înainte/după sunt permise?", a: "Da, cu acordul scris al clientelor — e formatul cu cea mai mare tracțiune în beauty." },
      { q: "Ce pachet recomandat pentru un salon nou?", a: "Local (150 RON) la deschidere, apoi abonamentul lunar pentru prezență constantă în sezoanele cheie." },
    ],
    keywords: ["promovare salon", "PR clinica estetica", "comunicat presa beauty", "publicitate salon oras", "promovare spa presa"],
  },
  {
    slug: "finante-contabilitate",
    name: "finanțe și contabilitate",
    heading: "Comunicate de presă pentru firme de contabilitate și consultanță",
    metaTitle: "PR financiar — contabili și consultanți ca autorități în presă",
    metaDescription:
      "Clienții vin la expertul pe care îl citesc: comentează schimbările fiscale în presă și devino prima opțiune a antreprenorilor din zona ta.",
    intro: [
      "De fiecare dată când se schimbă Codul Fiscal, mii de antreprenori caută pe Google ce înseamnă pentru ei. Contabilul care publică explicația clară în presă câștigă exact acei cititori drept clienți — pentru că și-a demonstrat competența înainte să i-o ceară cineva.",
      "Publicăm analizele tale despre taxe, dividende, e-Factura, SAF-T în presa locală și națională. Fiecare schimbare legislativă e o oportunitate de a fi sursa citată.",
    ],
    reasons: [
      { title: "Expertiza se arată, nu se afirmă", text: "„Contabil autorizat\" scrie oricine pe site. Articolul care explică noile plafoane TVA demonstrează." },
      { title: "Calendar fiscal = calendar editorial", text: "Ianuarie (declarații), martie (bilanțuri), modificări legislative — mereu există un subiect fierbinte." },
      { title: "Clienți B2B cu valoare mare", text: "Firmele care caută consultant financiar aleg pe criteriul încrederii — și plătesc retainer, nu o dată." },
      { title: "SEO pe întrebări fiscale", text: "„Impozit dividende 2026\" — articolele tale cu backlink prind căutări cu intenție comercială reală." },
    ],
    exampleTopics: [
      "Ce se schimbă la impozitul pe dividende din 2026 — explicat pe cazuri concrete",
      "e-Factura pentru firmele mici: ghidul de supraviețuire",
      "5 greșeli de contabilitate care aduc amenzi la control",
      "Micro sau SRL pe profit? Calculul corect în 2026",
      "Firma de contabilitate X își extinde echipa — 3 poziții deschise",
    ],
    faq: [
      { q: "Cât de tehnice pot fi articolele?", a: "Recomandăm nivelul „antreprenor fără studii economice\" — publicul larg al presei. Redactorul nostru AI traduce jargonul fiscal, tu verifici corectitudinea." },
      { q: "Cât de des merită publicat?", a: "Lunar — legislația se schimbă constant, iar abonamentul de 400 lei/lună ține numele firmei tale lipit de fiecare schimbare." },
      { q: "Merge și pentru brokeri sau consultanți de credite?", a: "Da — orice serviciu financiar unde încrederea decide alegerea: brokeraj, asigurări, creditare, fonduri europene." },
    ],
    keywords: ["PR firma contabilitate", "promovare contabil", "comunicat presa fiscal", "marketing servicii contabilitate", "promovare consultant financiar"],
  },
  {
    slug: "turism",
    name: "turism și ospitalitate",
    heading: "Comunicate de presă pentru pensiuni, hoteluri și atracții turistice",
    metaTitle: "PR turism — pensiunea ta în presa din toată România",
    metaDescription:
      "Turiștii vin din alte județe — presa națională îi aduce. Publică oferte de sezon, evenimente și povestea locului în 50 de ziare, în 12 ore lucrătoare.",
    intro: [
      "Turismul e industria în care clientul e mereu în alt județ decât tine. Pensiunea din Bucovina trăiește din bucureșteni, iar litoralul din ardeleni. De asta presa națională — nu cea locală — e canalul care umple camerele.",
      "Publicăm povestea locului tău în toate cele 50 de ziare: ofertele de sezon, evenimentele, experiențele unice. Cititorul care plănuiește city-break-ul următor te descoperă exact când caută idei.",
    ],
    reasons: [
      { title: "Clientul e la distanță", text: "Pachetul Național pune pensiunea ta în fața cititorilor din toate județele — bazinul real de turiști." },
      { title: "Sezonalitate amplificată", text: "Paște, 1 Mai, vară, Crăciun — articolul publicat cu 4-6 săptămâni înainte prinde valul de rezervări." },
      { title: "Poveștile vând destinații", text: "„Pensiunea unde faci brânză cu gazda\" bate „cazare 3 stele\" în orice format editorial." },
      { title: "SEO pe destinație", text: "„Cazare + zona ta\" — backlinkurile din 50 de domenii urcă site-ul tău peste agregatoare." },
    ],
    exampleTopics: [
      "Destinația de weekend: ce poți face 3 zile în zona X",
      "Pensiunea X lansează pachetul de Crăciun — tradiții autentice și preț",
      "Locul din România unde turiștii culeg singuri merele pentru plăcintă",
      "Top experiențe de iarnă în zona X — de la sanie la ciubăr",
      "Investiție: pensiunea X se extinde cu piscină și SPA",
    ],
    faq: [
      { q: "Local sau național pentru o pensiune?", a: "Național — turiștii tăi sunt prin definiție din alte județe. 50 de ziare acoperă toate bazinele de clienți." },
      { q: "Când public pentru sezonul de vară?", a: "Aprilie-mai, când se fac rezervările. Pentru sărbători, cu 4-6 săptămâni înainte. Abonamentul lunar acoperă toate ferestrele." },
      { q: "Pot include prețurile pachetelor?", a: "Da — advertorialele cu preț concret și perioadă convertesc cel mai bine în rezervări directe, fără comision de platformă." },
    ],
    keywords: ["promovare pensiune", "PR hotel", "comunicat presa turism", "promovare cazare presa", "publicitate destinatie turistica"],
  },
  {
    slug: "ong",
    name: "ONG-uri și cauze sociale",
    heading: "Comunicate de presă pentru ONG-uri și campanii sociale",
    metaTitle: "PR pentru ONG-uri — campaniile tale în presa din toată țara",
    metaDescription:
      "Strângeri de fonduri, campanii de 3,5%, proiecte comunitare — vizibilitatea în presă aduce donatori și voluntari. Publicare în 12 ore lucrătoare, în 50 de ziare.",
    intro: [
      "Cauzele bune nevăzute rămân nefinanțate. Donatorii dau către organizațiile despre care au citit, companiile sponsorizează proiecte cu vizibilitate, iar formularul de 3,5% se completează pentru ONG-urile cu nume cunoscut.",
      "Publicăm campaniile tale în presa locală și națională: strângerile de fonduri, rezultatele proiectelor, poveștile beneficiarilor. Transparența publică care transformă simpatia în donații.",
    ],
    reasons: [
      { title: "Donatorii verifică", text: "Înainte de a dona, oamenii caută organizația pe Google. Presa e dovada de legitimitate." },
      { title: "Sezonul 3,5%", text: "Ianuarie-mai e fereastra formularului 230 — articolele publicate atunci aduc redirecționări." },
      { title: "Sponsori corporate", text: "Companiile sponsorizează proiecte care le aduc vizibilitate — presa e argumentul tău în pitch." },
      { title: "Voluntari și parteneri", text: "Campaniile vizibile atrag oameni. Recrutarea de voluntari începe cu un articol bun." },
    ],
    exampleTopics: [
      "Campania X a strâns Y lei pentru Z — raportul complet",
      "Redirecționează 3,5% către asociația X — ce facem cu banii tăi",
      "Povestea lui M., primul beneficiar al programului X",
      "Asociația X caută 50 de voluntari pentru proiectul Y",
      "Parteneriat: compania Y susține programul educațional al asociației X",
    ],
    faq: [
      { q: "Există tarife speciale pentru ONG-uri?", a: "Tarifele standard sunt deja cele mai accesibile din piață (de la 150 RON). Pentru campanii sociale ample, scrie-ne — găsim o formulă." },
      { q: "Putem publica apeluri de donații cu cont IBAN?", a: "Da — articolele pot include IBAN, link de donație și toate datele campaniei." },
      { q: "Când publicăm pentru campania de 3,5%?", a: "Ianuarie-februarie, ca numele organizației să fie deja cunoscut când oamenii completează formularul." },
    ],
    keywords: ["PR ONG", "promovare campanie sociala", "comunicat presa ONG", "promovare strangere fonduri", "campanie 3.5% presa"],
  },
  {
    slug: "agricultura-food",
    name: "agricultură și producători locali",
    heading: "Comunicate de presă pentru fermieri și producători locali",
    metaTitle: "PR pentru producători locali — produsele tale în presa națională",
    metaDescription:
      "De la ferma ta pe mesele românilor: publică povestea produselor tale în 50 de ziare. Consumatorii caută producători autentici — ajută-i să te găsească.",
    intro: [
      "Românii vor să cumpere local — dar nu știu de la cine. Producătorul care își spune povestea în presă devine „ferma aceea despre care am citit\": brânza cu nume, mierea cu chip, legumele cu adresă.",
      "Publicăm povestea fermei tale în presa locală și națională: cum produci, ce te diferențiază, unde te găsesc clienții. De la vânzarea la poartă la listarea în marile lanțuri, totul începe cu notorietatea.",
    ],
    reasons: [
      { title: "Autenticitatea e moneda", text: "Consumatorul plătește premium pentru produsul cu poveste verificabilă — iar presa e verificarea." },
      { title: "Sezonul dictează", text: "Recolta, produsele de sărbători, coșul de vară — fiecare sezon e un motiv de articol." },
      { title: "Drumul spre raft", text: "Achizitorii lanțurilor și HoReCa descoperă furnizori și prin presă — vizibilitatea deschide uși." },
      { title: "Vânzare directă", text: "Articolul cu link spre pagina ta de comandă scurtcircuitează intermediarii." },
    ],
    exampleTopics: [
      "Ferma X: cum se face brânza maturată care ajunge pe mesele din toată țara",
      "Producătorul X livrează coșuri cu legume proaspete direct la ușă",
      "Povestea tânărului care s-a întors la sat pentru albinele familiei",
      "Produsele de Crăciun ale fermei X — comenzi deschise",
      "Ferma X obține certificarea ecologică — ce înseamnă pentru consumatori",
    ],
    faq: [
      { q: "Sunt producător mic — merită investiția?", a: "Pachetul Local e 150 RON — sub prețul unei zile de piață. Iar articolul lucrează pentru tine permanent, nu 8 ore." },
      { q: "Pot vinde direct din articol?", a: "Da — link către pagina de comandă, telefon, program. Multe ferme își construiesc lista de clienți fideli exact așa." },
      { q: "Ce pachet pentru livrare națională?", a: "Naționalul: 50 de ziare, toată țara. Dacă livrezi prin curier oriunde, publicul tău e național." },
    ],
    keywords: ["promovare producator local", "PR ferma", "comunicat presa produse locale", "promovare produse traditionale", "marketing fermier"],
  },
];

export function findIndustryBySlug(slug: string): Industry | undefined {
  return INDUSTRIES.find((i) => i.slug === slug);
}
