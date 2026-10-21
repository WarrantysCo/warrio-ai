import type { Metadata } from "next";

import PageShell from "@/app/components/PageShell";
import PolicyBody from "@/app/components/PolicyBody";
import { refundPolicyText } from "@/app/data/policies";
import { parsePolicy } from "@/app/lib/policyText";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "When and how you can cancel a Warrantys.co plan and get a refund.",
};

export default function RefundPolicyPage() {
  return (
    <PageShell eyebrow="Policy" title="Refund & Cancellation Policy">
      {/* The first two lines of the text are its own titles. */}
      <PolicyBody blocks={parsePolicy(refundPolicyText, 2)} />
    </PageShell>
  );
}
