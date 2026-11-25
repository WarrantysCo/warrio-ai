import type { Metadata } from "next";
import Link from "next/link";

import PageShell from "@/app/components/PageShell";
import FaqList from "@/app/components/FaqList";
import { faqText } from "@/app/data/policies";
import { parseFaq } from "@/app/lib/policyText";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: parseFaq(faqText).map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer.join(" ") },
  })),
};

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about Warrantys.co extended warranty plans: what is covered, who can buy, how to activate and how to raise a service request.",
};

export default function FaqPage() {
  return (
    <PageShell
      eyebrow="FAQ"
      title="Questions people ask us"
      intro={
        <>
          Can&apos;t find your answer?{" "}
          <Link href="/#ask" className="font-semibold text-brand-blue hover:text-brand-blue-dark">
            Ask Warrio
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="font-semibold text-brand-blue hover:text-brand-blue-dark">
            contact us
          </Link>
          .
        </>
      }
    >
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FaqList />
    </PageShell>
  );
}
