import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
