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
    nume: "Sublime Events", fundalInchis: true,
    // Din Cloudinary, cu potrivire la inaltimea benzii si format automat.
    logo: "https://res.cloudinary.com/dghmoelly/image/upload/e_trim/c_fit,h_120,q_auto,f_auto/v1789148188/Screenshot_1820_q1xj4n.png", site: "https://bilete.sublime.ro/", ce: "campania de presă pentru turneul „Atenție, vin urșii!” cu Micutzu, în 13 orașe" },
  { nume: "Toma Enache", fundalInchis: true, logo: "https://res.cloudinary.com/dghmoelly/image/upload/e_trim/c_fit,h_120,q_auto,f_auto/v1789148188/Screenshot_1825_ffcrra.png", site: "https://tomaenache.ro/", ce: "promovarea turneului în presa locală" },
  { nume: "RomCut.ro", logo: "https://res.cloudinary.com/dghmoelly/image/upload/e_trim/c_fit,h_120,q_auto,f_auto/v1789148188/Screenshot_1824_mlb1jq.png", ce: "optimizare debitare panouri" },
  { nume: "June", ce: "agenție de comunicare — comunicatele clienților", logo: "https://res.cloudinary.com/dghmoelly/image/upload/e_trim/c_fit,h_120,q_auto,f_auto/v1789148188/Screenshot_1823_i7a9p6.png", site: "https://www.junecom.ro/" },
  { nume: "Emblema Group", ce: "agenție de comunicare — comunicatele clienților", logo: "https://res.cloudinary.com/dghmoelly/image/upload/e_trim/c_fit,h_120,q_auto,f_auto/v1789148188/Screenshot_1822_vgu6wi.png", site: "https://emblemasolutions.ro/" },
  { nume: "C.A.R. Bistrița IFN", ce: "servicii financiare" },
  { nume: "Edrich Oradea", ce: "producător de atașamente pentru utilaje, din 1998" },
  { nume: "Cineplexx România", ce: "responsabilitate socială" },
  { nume: "Fundația Bog'Art", ce: "New Wave Art Prize" },
];
