import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import PageShell from "@/app/components/PageShell";
import { guides } from "@/app/data/guides";

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.metaDescription,
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  // FAQPage structured data so search and AI crawlers can parse the
  // question/answer pairs directly, in addition to the visible <details> list.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <PageShell eyebrow="Guide" title={guide.title} intro={guide.intro}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="space-y-3">
        {guide.faqs.map((faq, index) => (
          <details
            key={faq.question}
            className="group rounded-2xl border border-slate-200 bg-white open:bg-slate-50"
            open={index === 0}
          >
            <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-4 font-semibold">
              <span className="flex-1">{faq.question}</span>
              <span className="text-slate-500 transition group-open:rotate-90">
                ›
              </span>
            </summary>
            <p className="px-5 pb-5 text-sm leading-6 text-slate-700">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/plans"
          className="rounded-xl bg-brand-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-dark"
        >
          See your exact price
        </Link>
        <Link
          href="/warranty-check"
          className="rounded-xl border-2 border-brand-blue px-5 py-3 text-sm font-bold text-brand-blue transition hover:bg-blue-50"
        >
          Free warranty check
        </Link>
      </div>
    </PageShell>
  );
}
