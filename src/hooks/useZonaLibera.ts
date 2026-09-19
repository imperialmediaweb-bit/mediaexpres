"use client";

import { useEffect, useState } from "react";

/**
 * „Nu sta peste ce vinde." — regula comuna a elementelor plutitoare.
 *
 * 19.09.2026 — pe 16.09 bula de chat a fost invatata sa se dea la o parte de
 * pe butonul rosu de comanda. Verificarea paginii pe iPhone a aratat ca
 * problema era mai mare decat butonul: pe ecranul de 390px, bula de chat
 * statea peste „1.500 lei" taiat, iar cercul verde de WhatsApp musca din
 * „500 lei". Adica exact caseta de pret — al doilea lucru pe care il cauta
 * omul, dupa titlu. Doua elemente diferite acopereau acelasi loc, si doar
 * unul dintre ele stia sa se fereasca.
 *
 * De aceea regula sta acum intr-un singur loc, folosit de amandoua:
 *   - `data-comanda`   — butoanele de cumparare (pus in ButonComanda)
 *   - `data-nu-acoperi` — orice alta zona care nu trebuie acoperita (pretul)
 *
 * Cat timp una dintre ele e in fereastra, elementul plutitor se face
 * invizibil si nu mai prinde atingeri. Nu mutam bulele in alta parte:
 * orice pozitie fixa acopera, pe un ecran anume, altceva. Singura regula care
 * tine la orice inaltime de ecran e asta.
 */
export function useZonaLibera(activ: boolean = true): boolean {
  const [acopera, setAcopera] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver !== "function") return;
    if (!activ) {
      setAcopera(false);
      return;
    }
    // Doar pe ecrane mici: pe desktop bulele stau in colturi si nu acopera
    // nimic. `lg:` din Tailwind taie la 1024px, deci aceeasi limita.
    const mic = window.matchMedia("(max-width: 1023px)");
    if (!mic.matches) {
      setAcopera(false);
      return;
    }

    const vizibile = new Set<Element>();
    const obs = new IntersectionObserver(
      (intrari) => {
        for (const i of intrari) {
          if (i.isIntersecting) vizibile.add(i.target);
          else vizibile.delete(i.target);
        }
        setAcopera(vizibile.size > 0);
      },
      // Marja de jos cat inaltimea bulei plus bara fixa: zona „se apropie"
      // inainte sa fie complet pe ecran, si atunci bula trebuie sa fi
      // disparut deja.
      { rootMargin: "0px 0px -80px 0px", threshold: 0 },
    );

    const urmarite = new WeakSet<Element>();
    function adunaZone() {
      for (const el of document.querySelectorAll("[data-comanda], [data-nu-acoperi]")) {
        if (urmarite.has(el)) continue;
        urmarite.add(el);
        obs.observe(el);
      }
    }
    adunaZone();
    // Caseta de pret se randeaza dupa hidratare (depinde de pachetul ales),
    // deci la primul pas poate sa nu existe inca. Reluam de doua ori; fara
    // asta, pretul ar fi ramas neprotejat exact pe pagina pentru care s-a
    // scris regula.
    const t1 = window.setTimeout(adunaZone, 1200);
    const t2 = window.setTimeout(adunaZone, 3000);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      obs.disconnect();
    };
  }, [activ]);

  return acopera;
}
