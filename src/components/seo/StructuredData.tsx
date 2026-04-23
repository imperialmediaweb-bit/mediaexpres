import { SITE } from "@/data/site";

export function StructuredData() {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/logo.svg`,
    description: SITE.description,
    contactPoint: {
      "@type": "ContactPoint",
      email: SITE.email,
      telephone: SITE.phone,
      contactType: "customer service",
      areaServed: "RO",
      availableLanguage: ["Romanian"],
    },
    sameAs: [SITE.social.facebook, SITE.social.linkedin],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    inLanguage: "ro-RO",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
    </>
  );
}

export function PackagesStructuredData({
  packages,
}: {
  packages: { id: string; name: string; price: number; currency: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: packages.map((p, i) => ({
      "@type": "Product",
      position: i + 1,
      name: p.name,
      offers: {
        "@type": "Offer",
        price: p.price,
        priceCurrency: p.currency,
        availability: "https://schema.org/InStock",
        url: `${SITE.url}/pachete#${p.id}`,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
