import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Politica de cookies",
  description: "Informații despre cookie-urile folosite pe MediaExpres.",
  alternates: { canonical: "/legal/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalLayout title="Politica de cookies" updated="23 aprilie 2026">
      <h2 className="font-serif text-2xl font-bold text-brand-navy">Ce sunt cookie-urile</h2>
      <p>
        Cookie-urile sunt fișiere mici de text stocate pe dispozitivul tău când vizitezi un site
        web. Ele permit site-ului să-și amintească acțiunile și preferințele tale.
      </p>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">Ce cookie-uri folosim</h2>
      <ul>
        <li>
          <strong>Cookie-uri strict necesare</strong> — pentru funcționarea formularelor și sesiunea
          admin.
        </li>
        <li>
          <strong>Cookie-uri de performanță</strong> — opțional, pentru a înțelege cum e utilizat
          site-ul (nu folosim trackere agresive).
        </li>
      </ul>

      <h2 className="font-serif text-2xl font-bold text-brand-navy">Cum le controlezi</h2>
      <p>
        Poți șterge sau bloca cookie-urile din setările browserului tău. Reține că dezactivarea
        cookie-urilor strict necesare poate afecta funcționalitatea site-ului.
      </p>
    </LegalLayout>
  );
}
