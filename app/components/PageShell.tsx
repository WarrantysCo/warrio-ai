import type { ReactNode } from "react";

import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

// Layout for the plain content pages (plans, FAQ, policies, contact).
export default function PageShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(30,139,232,0.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-5xl px-6 py-14">
          <div className="text-sm font-semibold uppercase tracking-wider text-brand-blue">
            {eyebrow}
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            {title}
          </h1>
          {intro && (
            <div className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">
              {intro}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 py-12">{children}</div>

      <SiteFooter />
    </main>
  );
}
