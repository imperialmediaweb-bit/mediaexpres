import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, Oswald } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SITE } from "@/data/site";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  ConversionBanner,
  ConversionWidgets,
} from "@/components/conversion/ConversionWidgets";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin", "latin-ext"],
  variable: "--font-oswald",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#c1121f",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s • ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "comunicat de presă",
    "distribuție comunicate",
    "ziare românești",
    "publicare articole",
    "press release",
    "PR",
    "marketing",
    "SEO",
    "cazino",
    "iGaming",
  ],
  authors: [{ name: SITE.name }],
  openGraph: {
    type: "website",
    locale: "ro_RO",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: "/og-default.svg", width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: ["/og-default.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/favicons/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicons/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ro"
      className={`${playfair.variable} ${inter.variable} ${oswald.variable}`}
    >
      <body className="min-h-screen font-sans flex flex-col">
        <MetaPixel />
        <StructuredData />
        <ConversionBanner />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <ConversionWidgets />
      </body>
    </html>
  );
}
