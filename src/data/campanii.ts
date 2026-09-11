/**
 * Campanii, descrise — fara linkuri.
 *
 * Proprietarul (11.09.2026): la portofoliu campaniile se PUN, dar nu cu
 * linkurile, ci cu ce a vrut clientul si ce a primit. Rostul lor e sa arate
 * omului care ezita ca firme ca a lui au facut asta si pentru ce. Linkurile
 * catre articole raman in sectiunea de articole; raportul complet se arata
 * o singura data, ca exemplu de cum arata.
 *
 * Primele patru sunt clientii „de top" (organizatori, agentii de
 * comunicare) — ei apar si cu logo pe oferta. Aceeasi regula ca in
 * portfolio.ts: doar clienti care ar fi multumiti sa fie vazuti aici.
 * Un rand sters = client scos.
 */
export interface Campanie {
  client: string;
  categorie: string;
  /** Ce a vrut sa obtina — o fraza, pe intelesul unui viitor client. */
  scop: string;
  /** Ce s-a livrat, punct cu punct. */
  livrat: string[];
  data: string;
}

export const CAMPANII: Campanie[] = [
  {
    client: "Sublime Events",
    categorie: "Organizator de evenimente",
    scop: "Săli pline pentru turneul de stand-up „Atenție, vin urșii!”, cu Micutzu, Geo Adrian, George Dumitru și Alex Ioniță, în 13 orașe din țară.",
    livrat: [
      "câte un articol scris special pentru fiecare oraș din turneu: data, sala, orele și linkul de bilete",
      "publicat în ziarul local al fiecărui oraș, plus în cele 9 publicații naționale",
      "distribuire pe paginile de Facebook ale ziarelor și promovare plătită țintită pe orașele turneului",
      "articolele rămân online pe toată durata turneului și după",
    ],
    data: "toamna 2026",
  },
  {
    client: "Toma Enache",
    categorie: "Film și teatru",
    scop: "Promovarea turneului său în orașele vizitate, ca publicul local să afle din presa lui despre spectacol.",
    livrat: [
      "articole în ziarele locale din orașele turneului, adaptate fiecărui oraș",
      "apariții în publicațiile naționale ale rețelei",
      "distribuire pe paginile de Facebook ale publicațiilor",
      "raport cu toate aparițiile, pentru echipa de promovare",
    ],
    data: "2026",
  },
  {
    client: "Emblema Group",
    categorie: "Agenție de comunicare",
    scop: "Comunicatele de presă ale clienților agenției, publicate rapid și pe toată țara, cu dovada aparițiilor pentru fiecare client.",
    livrat: [
      "comunicate publicate în cele 50 de publicații din rețea, cu formulare proprie pe fiecare ziar",
      "publicare în ore, nu în zile, ca știrea să prindă momentul",
      "raport cu toate linkurile, pe care agenția îl dă mai departe clientului",
      "colaborare recurentă, comunicat după comunicat",
    ],
    data: "2026",
  },
  {
    client: "June",
    categorie: "Agenție de comunicare",
    scop: "Un canal de presă sigur pentru comunicatele clienților agenției, cu apariții garantate și raport pentru fiecare campanie.",
    livrat: [
      "comunicatele clienților, publicate în toată rețeaua, fiecare cu titlu și text propriu",
      "distribuire pe paginile de Facebook ale ziarelor",
      "trimitere la indexare imediat după publicare",
      "raport de publicare, gata de trimis clientului final",
    ],
    data: "2026",
  },
  {
    client: "C.A.R. Bistrița IFN",
    categorie: "Servicii financiare",
    scop: "Să facă cunoscut, în toată țara, primul C.A.R. 100% online din România pentru salariați și pensionari.",
    livrat: [
      "50 de articole, câte unul pentru fiecare publicație, cu titlu și text scrise separat",
      "46 de postări pe paginile de Facebook ale ziarelor",
      "campanie plătită pe Facebook, 4 zile, către publicul ales de client",
      "trimitere la indexare în Google imediat după publicare",
    ],
    data: "septembrie 2026",
  },
  {
    client: "Reparații acoperișuri montaj",
    categorie: "Construcții",
    scop: "Clienți noi pentru o firmă de montaj și reparații acoperișuri, cu accent pe proprietarii de case.",
    livrat: [
      "50 de articole distincte, în toate publicațiile din rețea",
      "46 de postări pe Facebook, cu linkul în comentariu",
      "campanie plătită pe Facebook, 4 zile, țintită pe publicul „Case”",
      "raport cu toate adresele, permanente",
    ],
    data: "septembrie 2026",
  },
  {
    client: "Edrich SRL, Oradea",
    categorie: "Producție industrială",
    scop: "Notorietate pentru un producător de atașamente pentru excavatoare, prezent din 1998, cu marcă înregistrată.",
    livrat: [
      "50 de articole, fiecare cu titlu și text propriu, cu link către site-ul firmei și datele de contact",
      "distribuire pe paginile de Facebook ale publicațiilor",
      "trimitere la indexare către Google, Bing, Yandex, Seznam și Naver",
      "raport de publicare cu toate cele 50 de adrese",
    ],
    data: "septembrie 2026",
  },
];

/** Raportul aratat ca exemplu — unul singur, sa se vada cum arata. */
export const EXEMPLU_RAPORT = {
  client: "Reparații acoperișuri montaj",
  url: "/rapoarte/exemplu-raport-publicare.pdf",
  descriere:
    "4 pagini: ce s-a livrat, captura din contul de publicitate, cele 50 de publicații cu adresa fiecărui articol și postarea de Facebook, confirmarea trimiterii la indexare.",
};
