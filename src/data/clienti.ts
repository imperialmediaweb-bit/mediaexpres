/**
 * Clientii care au publicat prin MediaExpres si pot fi aratati pe site.
 *
 * Banda cu logo-uri raspunde la intrebarea nespusa a omului care ezita la
 * plata: „a mai cumparat cineva serios de aici?". Aceeasi regula ca la
 * portofoliu: se pun doar clientii care ar fi multumiti sa fie vazuti. Daca
 * unul cere sa fie scos, se sterge randul lui si gata.
 *
 * Logo-ul e optional: cand fisierul din public/clienti/ nu exista, apare
 * numele ca text. Asa se poate adauga clientul azi si logo-ul cand e.
 */
export interface ClientAfisat {
  nume: string;
  /**
   * Numele fisierului din public/clienti/ (ex. "romcut.png") SAU un link
   * complet (https://res.cloudinary.com/...). Linkul se foloseste direct.
   */
  logo?: string;
  /** Site-ul clientului, doar daca vrem sa trimitem oameni acolo. */
  site?: string;
  /** Cu ce a venit la noi — o vorba, pentru tooltip. */
  ce?: string;
  /** Logo pe fundal inchis: cartonasul lui se face inchis, sa para intentionat. */
  fundalInchis?: boolean;
}

export const CLIENTI: ClientAfisat[] = [
  {
    nume: "Sublime Events",
    // Din Cloudinary. e_make_transparent scoate fundalul inchis al
    // screenshotului; la Toma Enache e_negate intoarce intai textul alb in negru.
    logo: "https://res.cloudinary.com/dghmoelly/image/upload/e_make_transparent:30/e_trim/c_fit,h_120,q_auto,f_png/v1789148188/Screenshot_1820_q1xj4n.png", site: "https://bilete.sublime.ro/", ce: "campania de presă pentru turneul „Atenție, vin urșii!” cu Micutzu, în 13 orașe" },
  { nume: "Toma Enache", logo: "https://res.cloudinary.com/dghmoelly/image/upload/e_negate/e_make_transparent:30/e_trim/c_fit,h_120,q_auto,f_png/v1789148188/Screenshot_1825_ffcrra.png", site: "https://tomaenache.ro/", ce: "promovarea turneului în presa locală" },
  { nume: "RomCut.ro", logo: "https://res.cloudinary.com/dghmoelly/image/upload/e_trim/c_fit,h_120,q_auto,f_auto/v1789148188/Screenshot_1824_mlb1jq.png", ce: "optimizare debitare panouri" },
  { nume: "June", ce: "agenție de comunicare — comunicatele clienților", logo: "https://res.cloudinary.com/dghmoelly/image/upload/e_trim/c_fit,h_120,q_auto,f_auto/v1789148188/Screenshot_1823_i7a9p6.png", site: "https://www.junecom.ro/" },
  { nume: "Emblema Group", ce: "agenție de comunicare — comunicatele clienților", logo: "https://res.cloudinary.com/dghmoelly/image/upload/e_trim/c_fit,h_120,q_auto,f_auto/v1789148188/Screenshot_1822_vgu6wi.png", site: "https://emblemasolutions.ro/" },

  // 16.09.2026 — restul clientilor care au cumparat, fara logo si fara link
  // catre site-ul lor. Rostul lor e altul decat al celor cinci de sus: aceia
  // conving prin cine sunt, acestia arata ca nu vorbim de trei clienti in
  // total. Ordinea din fisier e ordinea de pe pagina (componenta nu sorteaza),
  // deci cei importanti raman primii.
  //
  // Aceeasi regula ca mai sus: doar clienti care ar fi multumiti sa fie vazuti.
  // Un rand sters = client scos, imediat, fara discutie.
  { nume: "Nextway Digital Solutions", ce: "articol pentru comerț online" },
  { nume: "DDD Constance Perfect Clean", ce: "servicii de deratizare și dezinsecție" },
  { nume: "Art Junkie", ce: "amenajarea ferestrelor — showroom Iași" },
  { nume: "Net Reporting", ce: "campanie pe rețea" },
  { nume: "Maya Agency", ce: "agenție — comunicatele clienților" },
  { nume: "Vellis Training Center", ce: "centru de formare profesională" },
  { nume: "Viva Expert Solutions", ce: "servicii pentru firme" },
  { nume: "Granit Negru", ce: "plăci și lucrări din piatră" },
  { nume: "Edrich", ce: "campanie de prezentare" },
  { nume: "Casa de Ajutor Reciproc Bistrița", ce: "instituție financiară — comunicare publică" },
  { nume: "Asociația Cenaclul Literar-Artistic „La Steaua”", ce: "eveniment cultural" },
];
