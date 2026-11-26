import type { Metadata } from "next";
import "./globals.css";
import GoogleAnalytics from "./components/GoogleAnalytics";
import GoogleCustomerReviewsBadge from "./components/GoogleCustomerReviewsBadge";
import PartnerTracker from "./components/PartnerTracker";
import { contact } from "./data/contact";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: contact.brand,
  legalName: contact.company,
  url: "https://warrantys.co",
  logo: "https://warrantys.co/brand/warrantys-logo.png",
  description:
    "Extended warranty plans for TVs, refrigerators, washing machines, laptops and other home devices in India. Upload your bill, see your plan price, and get a warranty certificate by email.",
  email: contact.email,
  telephone: "+91 88751 92691",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Nayabans, Gautam Buddha Nagar",
    addressLocality: "Noida",
    addressRegion: "Uttar Pradesh",
    postalCode: "201301",
    addressCountry: "IN",
  },
  areaServed: "IN",
  sameAs: contact.socials.map((s) => s.href),
};

export const metadata: Metadata = {
  title: {
    default: "Warrantys.co | Extended warranty for your devices",
    template: "%s | Warrantys.co",
  },
  description:
    "Extended warranty plans for phones, TVs, laptops and home appliances. Upload your bill and Warrio, our AI assistant, finds your plan in seconds.",
  // Bing Webmaster Tools ownership check (public value, not a secret).
  verification: {
    other: { "msvalidate.01": "758D3B8DE7A12C6EB4E4FC6C8F8C6BBF" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
        <GoogleAnalytics />
        <PartnerTracker />
        <GoogleCustomerReviewsBadge />
      </body>
    </html>
  );
}
