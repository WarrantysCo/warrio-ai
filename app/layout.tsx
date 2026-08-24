import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Warrio AI",
  description: "Warrio AI warranty assistance",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
