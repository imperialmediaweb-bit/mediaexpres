/**
 * Portofoliul: articole publicate prin reteaua MediaExpres.
 *
 * Rostul paginii /exemple e sa raspunda la intrebarea pe care o are orice
 * client nou inainte sa plateasca — „cum arata, de fapt, articolul meu?".
 * Un link pe care il poate deschide face mai mult decat orice descriere.
 *
 * Ce se pune aici: articole chiar publicate, cu linkul lor real. Sunt publice
 * oricum — oricine intra pe ziarul respectiv le vede.
 *
 * Ce NU se pune: articolele clientilor care ar prefera sa nu se stie ca
 * aparitia e platita. Regula simpla, cand ai un dubiu: daca omul ar fi
 * multumit sa fie vazut in lista, il pui. Daca nu, il scoti — se sterge un
 * rand din fisierul asta si gata.
 */
export interface ArticolExemplu {
  /**
   * Firma sau organizatia care a comandat. Se completeaza doar cand stim sigur
   * — nu ghicim niciodata dupa titlu. Lipsa lui nu strica pagina: cardul arata
   * atunci doar categoria si articolul.
   */
  client?: string;
  titlu: string;
  publicatie: string;
  /** Un articol din campanie, ca sa se vada cum arata publicarea. */
  url: string;
  categorie: string;
  data: string;
  /**
   * Raportul campaniei — pagina cu TOATE cele 50 de linkuri, postarile de
   * Facebook si confirmarea trimiterii la indexare. Cand exista, cardul
   * primeste al doilea buton, iar asta e de fapt dovada grea: un articol
   * arata cum scriem, raportul arata ce inseamna 50 de aparitii.
   */
  raportUrl?: string;
  /** Acelasi raport, ca fisier, pentru cine il vrea la dosar. */
  raportPdf?: string;
}

export const PORTOFOLIU: ArticolExemplu[] = [
  {
    client: "C.A.R. Bistrița IFN",
    titlu:
      "A dispărut dosarul cu șină! Ce trebuie să știi despre C.A.R.?",
    publicatie: "toate cele 50 de publicații",
    url: "https://reteau-expres-production.up.railway.app/raport/8Y1_oL7bP4-_JaCXeIyM8A3ihc89Mauv",
    raportUrl:
      "https://reteau-expres-production.up.railway.app/raport/8Y1_oL7bP4-_JaCXeIyM8A3ihc89Mauv",
    categorie: "Servicii financiare",
    data: "septembrie 2026",
  },
  {
    client: "Fundația Bog'Art",
    titlu:
      "Fundația Bog'Art oferă premii de 10.000 de euro la New Wave Art Prize, ediția 2026",
    publicatie: "Iași Expres",
    url: "https://iasiexpres.ro/local/fundatia-bog-art-ofera-premii-de-10-000-de-euro-la-new-wave-art-prize-editia-2026-inteligenta-artificiala-tema-de-concurs-pentru-studentii-la-arte",
    categorie: "Cultură",
    data: "aprilie 2026",
  },
  {
    client: "Cineplexx România",
    titlu:
      "Cineplexx România, alături de elevii CSEI „Sf. Vasile” Craiova, într-o acțiune dedicată educației și incluziunii",
    publicatie: "Dolj Expres",
    url: "https://doljexpres.ro/local/comunicat-de-presa-incluziunea-merita-sa-fie-vazuta-cineplexx-romania-alaturi-de-elevii-csei-sf-vasile-craiova-intr-o-actiune-dedicata-educatiei-incluziunii-si-apartenentei",
    categorie: "Responsabilitate socială",
    data: "septembrie 2026",
  },
  {
    client: "Seminar dr. Menis Yousry",
    titlu:
      "Brașovul găzduiește un seminar transformațional susținut de dr. Menis Yousry",
    publicatie: "Brașov Expres",
    url: "https://brasovexpress.ro/local/brasovul-devine-intre-15-17-mai-spatiul-unei-intalniri-profunde-cu-sinele-si-cu-relatiile-noastre-in-cadrul-seminarului-transformational-sustinut-de-dr-menis-yousry",
    categorie: "Evenimente",
    data: "mai 2026",
  },
  {
    client: "Proiectul „Pachet de bază” Brașov",
    titlu:
      "Inima proiectului „Pachet de bază” Brașov: oamenii care își ajută vecinii să urce pe scara succesului",
    publicatie: "Brașov Expres",
    url: "https://www.brasovexpress.ro/2026/01/22/inima-proiectului-pachet-de-baza-brasov-oamenii-care-isi-ajuta-vecinii-sa-urce-pe-scara-succesului/",
    categorie: "Proiecte sociale",
    data: "ianuarie 2026",
  },
  {
    client: "Proiectul „Pachet de bază” Brașov",
    titlu:
      "Incluziune socială prin muncă: cum transformă proiectul „Pachet de bază” comunitățile vulnerabile din județul Brașov",
    publicatie: "Brașov Expres",
    url: "https://brasovexpress.ro/local/incluziune-sociala-prin-munca-cum-transforma-proiectul-pachet-de-baza-comunitatile-vulnerabile-din-judetul-brasov",
    categorie: "Proiecte sociale",
    data: "iunie 2026",
  },
  {
    titlu: "Ce abilități dobândești la un curs de ospătar și cum te ajută în viața de zi cu zi",
    publicatie: "Brașov Expres",
    url: "https://www.brasovexpress.ro/2025/10/20/ce-abilitati-dobandesti-la-un-curs-de-ospatar-si-cum-te-ajuta-in-viata-de-zi-cu-zi",
    categorie: "Educație",
    data: "octombrie 2025",
  },
  {
    titlu: "Case de vânzare în Brașov și zonele limitrofe — prețuri reale în 2026",
    publicatie: "Brașov Expres",
    url: "https://brasovexpress.ro/local/case-de-vanzare-in-brasov-si-zonele-limitrofe-preturi-reale-in-2026",
    categorie: "Imobiliare",
    data: "iulie 2026",
  },
  {
    titlu: "Când are sens să alegi un amanet auto în Iași și când nu",
    publicatie: "Iași Expres",
    url: "https://iasiexpres.ro/local/cand-are-sens-sa-alegi-un-amanet-auto-in-iasi-si-cand-nu",
    categorie: "Servicii financiare",
    data: "iulie 2026",
  },
  {
    titlu: "Implant dentar București — zâmbet nou, obținut în vacanță",
    publicatie: "Diaspora News",
    url: "https://diasporanews.ro/local/implant-dentar-bucuresti-zambet-nou-la-obtinut-in-vacanta",
    categorie: "Servicii medicale",
    data: "iulie 2026",
  },
  {
    titlu: "Funcționează epilarea definitivă? Ce trebuie să știi înainte",
    publicatie: "Dolj Expres",
    url: "https://www.doljexpres.ro/2025/08/14/functioneaza-epilarea-definitiva-ce-trebuie-sa-stii-inainte",
    categorie: "Servicii",
    data: "august 2025",
  },
];
