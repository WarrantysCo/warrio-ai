import type { Metadata } from "next";
import Link from "next/link";

import FaqList from "@/app/components/FaqList";
import PageShell from "@/app/components/PageShell";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms of the Warrantys.co Extended Warranty Plan: eligibility, coverage, service, exclusions and transfer rules.",
};

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Policy"
      title="Terms & Conditions"
      intro={
        <>
          These terms apply to every Warrantys.co Extended Warranty Plan. See
          also our{" "}
          <Link href="/refund-policy" className="font-semibold text-blue-400 hover:text-blue-300">
            Refund & Cancellation
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="font-semibold text-blue-400 hover:text-blue-300">
            Privacy Policy
          </Link>
          .
        </>
      }
    >
      <FaqList />
    </PageShell>
  );
}
