import type { Metadata } from "next";
import type { ReactNode } from "react";

import AdminNav from "./AdminNav";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// One menu on every admin page, so Amit can always get back to Home.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full flex-1 bg-slate-100">
      <header className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-lg font-black text-slate-900">Warrantys.co admin</div>
          <AdminNav />
        </div>
      </header>
      {children}
    </div>
  );
}
