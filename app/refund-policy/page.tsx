import type { Metadata } from "next";

import PageShell from "@/app/components/PageShell";
import PolicyBody from "@/app/components/PolicyBody";
import { contact } from "@/app/data/contact";
import { refundPolicyText } from "@/app/data/policies";
import { parsePolicy } from "@/app/lib/policyText";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description:
    "Cancel your Warrantys.co plan within 7 days of purchase for a full refund.",
};

export default function RefundPolicyPage() {
  return (
    <PageShell eyebrow="Policy" title="Refund & Cancellation Policy">
      <div className="mb-8 rounded-3xl border-2 border-brand-green bg-brand-green/10 p-6">
        <div className="text-xl font-black">✅ 7-day money-back promise</div>
        <p className="mt-2 leading-7 text-slate-700">
          Changed your mind? Cancel within 7 days of buying and get a full
          refund. No reason needed. Email {contact.email} or call / WhatsApp{" "}
          {contact.phone}.
        </p>
      </div>

      {/* The first two lines of the text are its own titles. */}
      <PolicyBody blocks={parsePolicy(refundPolicyText, 2)} />
    </PageShell>
  );
}
