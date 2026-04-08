import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();
const title = {
  default: "superberater — Multi-Agent Decision Engine",
  template: "%s | superberater",
};
const description =
  "Send a crew of AI agents with different perspectives to analyze your topic and reach better decisions. Live debates, moderator, OpenRouter models.";

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  keywords: [
    "AI agents",
    "multi-agent",
    "decision making",
    "OpenRouter",
    "debate",
    "superberater",
    "FastAPI",
    "Next.js",
  ],
  authors: [{ name: "superberater" }],
  creator: "superberater",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["de_DE"],
    url: "/",
    siteName: "superberater",
    title: title.default,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: title.default,
    description,
  },
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "superberater",
  description,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  url: siteUrl,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
