import type { Metadata } from "next";
import type { ReactNode } from "react";

import AdminNav from "./AdminNav";

export const metadata: Metadata = {
  title: "Admin | Warrantys.co",
  robots: { index: false, follow: false },
};

// One header and menu on every admin page, so Amit can always get back Home.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full flex-1 bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/warrantys-logo.png" alt="Warrantys.co" className="h-9 w-auto" />
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Admin
            </span>
          </div>
          <AdminNav />
        </div>
      </header>
      {children}
      <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-slate-400">
        Deetya Warranty Private Limited · private admin area
      </footer>
    </div>
  );
}
