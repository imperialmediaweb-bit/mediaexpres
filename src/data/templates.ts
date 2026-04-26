export interface Template {
  slug: string;
  category: "lansare" | "eveniment" | "parteneriat" | "rezultate" | "extindere" | "premii" | "csr";
  title: string;
  industry: string;
  description: string;
  body: string;
}

export const TEMPLATE_CATEGORIES: Record<Template["category"], string> = {
  lansare: "Lansare produs/serviciu",
  eveniment: "Eveniment",
  parteneriat: "Parteneriat",
  rezultate: "Rezultate financiare",
  extindere: "Extindere/locație nouă",
  premii: "Premiu/distincție",
  csr: "Acțiune CSR/socială",
};

export const TEMPLATES: Template[] = [
  {
    slug: "lansare-produs-tech",
    category: "lansare",
    title: "Lansare produs tech / SaaS",
    industry: "IT, software, tehnologie",
    description: "Format clasic pentru anunțarea unei aplicații, platforme sau funcționalități noi.",
    body: `[NUME COMPANIE] anunță lansarea [NUME PRODUS], o [tip produs] dedicată [public țintă]\n\n[Oraș], [data] — [NUME COMPANIE], [scurtă descriere companie], anunță lansarea oficială a [NUME PRODUS], o soluție concepută pentru a ajuta [public țintă] să [beneficiu principal].\n\n[NUME PRODUS] vine cu [3-4 funcționalități cheie], oferind utilizatorilor [beneficiu măsurabil — ex: economie de timp, reducere costuri].\n\n„[Citat de 2 propoziții al fondatorului/CEO-ului care explică problema rezolvată]", a declarat [NUME], [funcție] al [COMPANIE].\n\nProdusul este disponibil începând cu [data] la [URL]. Prețul de lansare este [preț] / lună, cu o perioadă gratuită de [X] zile pentru toți utilizatorii noi.\n\nDespre [NUME COMPANIE]: [2-3 propoziții despre companie, fondare, misiune, cifră echipă].`,
  },
  {
    slug: "lansare-produs-fizic",
    category: "lansare",
    title: "Lansare produs fizic / FMCG",
    industry: "Retail, FMCG, e-commerce",
    description: "Pentru orice produs fizic — de la cosmetice la electronice.",
    body: `[NUME COMPANIE] introduce pe piața din România [NUME PRODUS]\n\n[Oraș], [data] — [NUME COMPANIE] anunță lansarea oficială pe piața românească a [NUME PRODUS], [scurtă descriere produs] disponibil în [Y] variante / culori / mărimi.\n\nProdusul a fost dezvoltat pe parcursul [perioadă] și răspunde unei nevoi tot mai prezente în rândul consumatorilor români: [problemă concretă].\n\nCaracteristici principale:\n— [caracteristică 1]\n— [caracteristică 2]\n— [caracteristică 3]\n\n„[Citat — manager produs sau CEO]", spune [NUME], [funcție].\n\n[NUME PRODUS] poate fi achiziționat începând cu [data] din [canale distribuție: magazine fizice, online, parteneri], la prețul de [preț] RON.\n\nDespre [NUME COMPANIE]: [boilerplate].`,
  },
  {
    slug: "eveniment-conferinta",
    category: "eveniment",
    title: "Conferință/eveniment de business",
    industry: "Business, consultanță, B2B",
    description: "Anunțarea unei conferințe, workshop sau networking event.",
    body: `[NUME EVENIMENT] reunește [N] specialiști din [domeniu] la [oraș] pe [data]\n\n[Oraș], [data anunțului] — [NUME COMPANIE] organizează în data de [data eveniment], la [locație], a [a câta ediție] ediție a [NUME EVENIMENT], dedicată [tema principală].\n\nLa eveniment sunt așteptați peste [N] participanți, profesioniști și antreprenori din [industrii reprezentate]. Printre vorbitori se numără [3-5 nume relevante cu funcții].\n\nAgenda evenimentului include:\n— [10:00] [Tema 1]\n— [12:00] [Panel discussion]\n— [14:00] [Workshop]\n— [16:00] [Networking]\n\n„[Citat de la organizator despre relevanța evenimentului]", a declarat [NUME], [funcție].\n\nÎnscrierile se fac online la [URL], iar locurile sunt limitate la [N]. Taxa de participare este [preț] sau gratuită pentru [categorie].\n\nDespre [NUME COMPANIE]: [boilerplate].`,
  },
  {
    slug: "parteneriat-strategic",
    category: "parteneriat",
    title: "Parteneriat strategic între două companii",
    industry: "Orice domeniu",
    description: "Pentru anunțarea unei colaborări, joint venture sau parteneriat tehnologic.",
    body: `[COMPANIA A] și [COMPANIA B] anunță un parteneriat strategic pentru [obiectiv comun]\n\n[Oraș], [data] — [COMPANIA A], [scurtă descriere], și [COMPANIA B], [scurtă descriere], anunță încheierea unui parteneriat strategic care va permite [beneficiu concret pentru clienți / piață].\n\nÎn baza acestui acord, cele două companii vor [acțiuni specifice: integrarea tehnologiilor / acces comun la piață / dezvoltarea unei oferte combinate].\n\nParteneriatul vizează în special [public țintă] și se așteaptă să genereze [rezultat estimat: număr clienți, volum afaceri, etc.] în primul an.\n\n„[Citat reprezentant Compania A]", a declarat [NUME], [funcție].\n\n„[Citat reprezentant Compania B]", a adăugat [NUME], [funcție].\n\nPrimele rezultate concrete ale colaborării sunt așteptate până la [data], iar serviciile combinate vor fi disponibile clienților începând cu [data].\n\nDespre [COMPANIA A]: [boilerplate].\nDespre [COMPANIA B]: [boilerplate].`,
  },
  {
    slug: "rezultate-anuale",
    category: "rezultate",
    title: "Bilanț financiar anual",
    industry: "Toate, în special IMM-uri",
    description: "Anunțarea cifrelor de afaceri, creșterii sau a rezultatelor anuale.",
    body: `[NUME COMPANIE] încheie [anul] cu o cifră de afaceri de [X] milioane RON, în creștere cu [%] față de anul precedent\n\n[Oraș], [data] — [NUME COMPANIE], [scurtă descriere], anunță rezultatele financiare pentru anul [anul], înregistrând o cifră de afaceri de [X] milioane RON, în creștere cu [Y]% față de [anul precedent].\n\nCreșterea a fost susținută de [factori: extindere geografică / nou produs / parteneriate / cerere crescută]. Compania a finalizat anul cu [N] angajați, în creștere cu [Z]% față de [anul precedent].\n\nPrincipalele realizări ale anului [anul]:\n— [realizare 1 cu cifră]\n— [realizare 2 cu cifră]\n— [realizare 3 cu cifră]\n\nPentru [anul următor], [NUME COMPANIE] estimează o creștere de [%] și plănuiește [obiective: lansări, extinderi, investiții].\n\n„[Citat CEO despre context și planuri]", a declarat [NUME], [funcție].\n\nDespre [NUME COMPANIE]: [boilerplate].`,
  },
  {
    slug: "extindere-locatie-noua",
    category: "extindere",
    title: "Deschidere sediu/magazin nou",
    industry: "Retail, servicii, sănătate",
    description: "Pentru orice extindere fizică — magazin, clinică, birou, hub regional.",
    body: `[NUME COMPANIE] deschide [tip locație] la [oraș], a [a câta] locație din rețea\n\n[Oraș nou], [data] — [NUME COMPANIE] anunță deschiderea oficială, la data de [data], a unei noi [tip locație] în [oraș], extinzându-și astfel rețeaua la [N] [locații / orașe].\n\nNoua locație, situată pe [adresa], are [suprafață] m² și [N] [angajați / cabinete / posturi de lucru]. Investiția în această deschidere a fost de [X] RON.\n\nServiciile/produsele disponibile la noua locație includ:\n— [serviciu/produs 1]\n— [serviciu/produs 2]\n— [serviciu/produs 3]\n\nProgramul de funcționare este [program]. Clienții pot face programări prin [canal: telefon, online].\n\n„[Citat manager regional sau CEO despre alegerea orașului și planuri]", a declarat [NUME], [funcție].\n\nPentru a marca deschiderea, [NUME COMPANIE] oferă [campanie/ofertă specială] în primele [perioadă].\n\nDespre [NUME COMPANIE]: [boilerplate].`,
  },
  {
    slug: "premiu-distinctie",
    category: "premii",
    title: "Premiu sau distincție primită",
    industry: "Orice industrie",
    description: "Pentru anunțarea unui premiu, certificare sau recunoaștere internațională.",
    body: `[NUME COMPANIE] câștigă [NUME PREMIU] la [organizator] pentru [categoria]\n\n[Oraș], [data] — [NUME COMPANIE], [scurtă descriere companie], a fost desemnat [tip premiu: câștigător / finalist] al [NUME PREMIU] la categoria [categoria], în cadrul ceremoniei desfășurate pe [data] la [locație].\n\nPremiul recunoaște [criteriu / merit specific] și a fost decernat de [organizator + scurtă descriere].\n\n[NUME COMPANIE] s-a remarcat în fața juriului pentru [3 puncte forte concrete care au fost evaluate].\n\n„[Citat CEO despre semnificația premiului]", a declarat [NUME], [funcție].\n\nAcesta este al [a câtelea] premiu obținut de [NUME COMPANIE] în [perioada], după [premiu anterior, dacă există].\n\nDespre [NUME COMPANIE]: [boilerplate].\nDespre [NUME PREMIU]: [scurtă descriere a importanței și organizatorului].`,
  },
  {
    slug: "csr-actiune-comunitate",
    category: "csr",
    title: "Acțiune de responsabilitate socială",
    industry: "Orice industrie",
    description: "Pentru proiecte CSR — donații, voluntariat, sustenabilitate.",
    body: `[NUME COMPANIE] investește [X] RON în [proiectul CSR] pentru a sprijini [beneficiari]\n\n[Oraș], [data] — [NUME COMPANIE], [scurtă descriere], anunță lansarea proiectului [NUME PROIECT], o inițiativă de [tip: educațională / de mediu / socială] cu un buget total de [X] RON pe perioada [interval].\n\nProiectul va beneficia direct [N] [tip beneficiari: copii, studenți, comunități, hectare reabilitate] din [zonele/orașele vizate], prin [acțiuni concrete: ateliere, dotări, plantări, etc.].\n\nPrincipalele direcții de acțiune:\n— [direcție 1]\n— [direcție 2]\n— [direcție 3]\n\nProiectul va fi implementat în parteneriat cu [ONG / instituție / autoritate], iar primele rezultate vor fi vizibile în [interval].\n\n„[Citat manager CSR sau CEO despre motivația proiectului]", a declarat [NUME], [funcție].\n\nProgresul proiectului poate fi urmărit pe [URL] și pe canalele de social media ale [NUME COMPANIE].\n\nDespre [NUME COMPANIE]: [boilerplate].`,
  },
  {
    slug: "lansare-finantare",
    category: "rezultate",
    title: "Atragere de finanțare / investiție",
    industry: "Startup, scale-up",
    description: "Pentru runde de investiție, finanțări venture capital sau credit bancar major.",
    body: `[NUME COMPANIE] atrage o finanțare de [X] [milioane EUR/RON] pentru [obiectiv]\n\n[Oraș], [data] — [NUME COMPANIE], [scurtă descriere], anunță încheierea unei runde de finanțare [tip: seed / Series A / etc.] în valoare de [X] [milioane EUR/RON], condusă de [investitor principal] cu participarea [alți investitori].\n\nFondurile vor fi folosite pentru [direcții: dezvoltare produs / expansiune internațională / scalare echipă / etc.].\n\n[NUME COMPANIE] a fost fondată în [anul] de [fondatori] și a crescut [metric: utilizatori / cifră afaceri / clienți] cu [%] în [perioada].\n\n„[Citat CEO/fondator despre planuri post-finanțare]", a declarat [NUME], [funcție].\n\n„[Citat investitor principal despre potențialul companiei]", a adăugat [NUME], [funcție investitor].\n\nÎn următoarele 12 luni, compania plănuiește să [obiective concrete: lansări, angajări, piețe noi].\n\nDespre [NUME COMPANIE]: [boilerplate].\nDespre [INVESTITOR]: [scurtă descriere].`,
  },
  {
    slug: "campanie-promotionala",
    category: "lansare",
    title: "Campanie promoțională / reducere",
    industry: "Retail, e-commerce, servicii",
    description: "Pentru orice campanie cu reducere — Black Friday, lichidare stoc, ofertă sezonieră.",
    body: `[NUME COMPANIE] lansează campania [NUME CAMPANIE] cu reduceri de până la [%] la [categoria]\n\n[Oraș], [data] — [NUME COMPANIE], [scurtă descriere], dă startul campaniei [NUME CAMPANIE] în perioada [interval], oferind reduceri de până la [%] la o selecție de peste [N] produse din categoria [categoria].\n\nCampania include:\n— [reducere 1]\n— [reducere 2]\n— [bonus / cadou / livrare gratuită]\n\nPrintre cele mai atractive oferte se numără [3-4 produse cu prețuri concrete].\n\nClienții pot accesa campania pe [URL] sau în magazinele fizice din [orașe / țară].\n\n„[Citat marketing manager sau CEO]", a declarat [NUME], [funcție].\n\nCampania este valabilă în limita stocului disponibil și se încheie pe [data].\n\nDespre [NUME COMPANIE]: [boilerplate].`,
  },
  {
    slug: "studiu-cercetare",
    category: "rezultate",
    title: "Studiu / cercetare de piață",
    industry: "Consultanță, agenții, B2B",
    description: "Pentru anunțarea rezultatelor unui studiu de piață sau cercetare proprie.",
    body: `Studiu [NUME COMPANIE]: [N]% dintre [public] [comportament/concluzie principală]\n\n[Oraș], [data] — Un studiu realizat de [NUME COMPANIE] în perioada [interval] pe un eșantion de [N] [respondenți: companii / persoane / etc.] arată că [concluzia principală în 1 propoziție].\n\nAlte rezultate notabile ale studiului:\n— [statistică 1 + cifră]\n— [statistică 2 + cifră]\n— [statistică 3 + cifră]\n\nMetodologia: studiul a fost realizat prin [metoda] în perioada [interval], cu o marjă de eroare de [+/- N%].\n\n„[Citat de la analist principal — explică implicațiile]", a declarat [NUME], [funcție].\n\nRaportul complet poate fi descărcat gratuit de pe [URL].\n\nDespre [NUME COMPANIE]: [boilerplate].`,
  },
  {
    slug: "schimbare-management",
    category: "premii",
    title: "Numire / promovare în echipa de management",
    industry: "Corporate",
    description: "Pentru numirea unui CEO, director sau alt rol cheie.",
    body: `[NUME COMPANIE] îl numește pe [NUME PERSOANĂ] în funcția de [FUNCȚIE]\n\n[Oraș], [data] — [NUME COMPANIE] anunță numirea [NUME PERSOANĂ] în funcția de [FUNCȚIE], începând cu data de [data]. În noul rol, [prenume] va coordona [arii de responsabilitate].\n\n[NUME PERSOANĂ] are o experiență de peste [N] ani în [domeniu], dintre care ultimii [Y] la [companie precedentă], unde a fost responsabil pentru [realizări concrete].\n\nPrincipalele obiective pentru următoarele 12 luni:\n— [obiectiv 1]\n— [obiectiv 2]\n— [obiectiv 3]\n\n„[Citat CEO/board despre alegerea persoanei]", a declarat [NUME], [funcție].\n\n„[Citat al persoanei numite despre planuri]", a spus [NUME PERSOANĂ].\n\n[Prenume] este absolvent al [universitate] și deține [certificări/diplome relevante].\n\nDespre [NUME COMPANIE]: [boilerplate].`,
  },
];

export function findTemplateBySlug(slug: string): Template | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}
