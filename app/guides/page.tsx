import type { Metadata } from "next";
import Link from "next/link";

import PageShell from "@/app/components/PageShell";
import { guides } from "@/app/data/guides";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Straight answers on extended warranty for TVs, refrigerators, ACs, washing machines and more, with real Warrantys.co prices.",
};

export default function GuidesIndexPage() {
  return (
    <PageShell
      eyebrow="Guides"
      title="Extended warranty, explained"
      intro="Straight answers to the questions people actually ask, with real prices — not sales copy."
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/guides/${guide.slug}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-blue hover:shadow-md"
            >
              <div className="font-bold text-slate-900">{guide.title}</div>
              <p className="mt-2 text-sm text-slate-600">{guide.metaDescription}</p>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
