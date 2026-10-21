import type { Metadata } from "next";
import Link from "next/link";

import PageShell from "@/app/components/PageShell";
import FaqList from "@/app/components/FaqList";

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
          <Link href="/#ask" className="font-semibold text-blue-400 hover:text-blue-300">
            Ask Warrio
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="font-semibold text-blue-400 hover:text-blue-300">
            contact us
          </Link>
          .
        </>
      }
    >
      <FaqList />
    </PageShell>
  );
}
