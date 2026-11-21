import type { Metadata } from "next";
import "./globals.css";
import GoogleAnalytics from "./components/GoogleAnalytics";
import GoogleCustomerReviewsBadge from "./components/GoogleCustomerReviewsBadge";
import PartnerTracker from "./components/PartnerTracker";

export const metadata: Metadata = {
  title: {
    default: "Warrantys.co | Extended warranty for your devices",
    template: "%s | Warrantys.co",
  },
  description:
    "Extended warranty plans for phones, TVs, laptops and home appliances. Upload your bill and Warrio, our AI assistant, finds your plan in seconds.",
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
        {children}
        <GoogleAnalytics />
        <PartnerTracker />
        <GoogleCustomerReviewsBadge />
      </body>
    </html>
  );
}
