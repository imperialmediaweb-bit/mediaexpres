import type { Metadata } from "next";
import { CIFRE } from "@/data/cifre";
import { NEWSPAPERS } from "@/data/newspapers";
import { PaginaCazino } from "./PaginaCazino";

// 10.11.2026 (user: „o pagină specială doar pentru cazinouri… o singură ofertă… să arate mega tare")
// Aceeași comandă ca /oferta-500 (formular → card/OP → factură → raport), pachetul promo-50-cazino-pro.
export const metadata: Metadata = {
  title: "Ofertă iGaming: articolul tău în 50 de ziare online — 2.000 lei",
  description:
    "Pentru cazinouri și case de pariuri licențiate ONJN: un articol unic în 50 de ziare online, 3 linkuri dofollow pe articol, indexare grăbită, 7 zile pe prima pagină. 2.000 lei.",
  alternates: { canonical: "/oferta-cazino" },
  robots: { index: true, follow: true },
};

export default function Page() {
  const ziare = NEWSPAPERS.map((n) => ({ nume: n.name, url: n.url, tip: n.type }));
  return (
    <PaginaCazino
      ziare={ziare}
      cifre={{
        publicatii: CIFRE.publicatii,
        articolePeZi: CIFRE.articolePeZi,
        paginiFacebook: CIFRE.paginiFacebook,
        urmaritoriFacebook: CIFRE.urmaritoriFacebook,
        botosaniAfisari: CIFRE.botosani.afisari,
      }}
    />
  );
}
