"use client";

import { useEffect, useRef } from "react";

/**
 * Caseta de eroare a unui formular, care se aduce singura in ecran.
 *
 * Mesajul sta in DOM chiar deasupra butonului apasat — corect, dar nu
 * suficient. Testul de rezistenta a prins cazul: pe telefon, cand omul a
 * derulat putin peste buton si butonul e in partea de sus a ecranului,
 * mesajul se randeaza DEASUPRA lui, adica in afara ecranului (y = -90).
 * Omul apasa si nu vede nimic — aceeasi tacere care a costat comenzi,
 * doar ca de data asta cu mesajul existand, invizibil.
 *
 * Deci la fiecare mesaj nou, daca nu e complet in ecran, il aducem in
 * centru. Sarit, nu lin: un salt e un raspuns clar la o apasare.
 */
export function FormError({
  message,
  className,
}: {
  message: string | null | undefined;
  className: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!message) return;
    const arata = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const inEcran = r.top >= 0 && r.bottom <= window.innerHeight;
      // „instant", nu „auto": <html> are scroll-behavior: smooth, iar „auto"
      // inseamna „cum zice CSS-ul" — adica o animatie de ~300ms in timpul
      // careia omul vede pagina alunecand, nu mesajul.
      if (!inEcran) el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    };
    // O data acum si de doua ori dupa: pagina se mai misca SI dupa apasare —
    // tastatura telefonului se inchide, o derulare lina inca in curs isi
    // termina drumul — si mesajul care era in ecran la prima verificare
    // ajunge deasupra lui. Trecerile tarzii il aduc inapoi.
    arata();
    const t1 = setTimeout(arata, 250);
    const t2 = setTimeout(arata, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [message]);

  if (!message) return null;
  return (
    <p ref={ref} role="alert" className={className}>
      {message}
    </p>
  );
}
