"use client";

import { useEffect, useState } from "react";
import { citesteSursaDinBrowser, propozitieSursaWhatsApp } from "@/lib/sursa";

/**
 * Propozitia de adaugat la mesajul pre-scris de WhatsApp („Am văzut oferta pe
 * Google.”), sau sir gol.
 *
 * Se citeste abia dupa montare: pe server nu exista cookie-ul, iar daca am
 * citi la prima randare pe client, HTML-ul de la server si cel din browser
 * ar diferi si React ar da eroare de hidratare.
 */
export function useSursaWhatsApp(): string {
  const [propozitie, setPropozitie] = useState("");
  useEffect(() => {
    setPropozitie(propozitieSursaWhatsApp(citesteSursaDinBrowser()));
  }, []);
  return propozitie;
}
