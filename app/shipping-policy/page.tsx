import type { Metadata } from "next";

import PageShell from "@/app/components/PageShell";
import { contact } from "@/app/data/contact";
import { deliveryText } from "@/app/data/policies";

export const metadata: Metadata = {
  title: "Delivery Policy",
  description: "How your Warrantys.co plan certificate is delivered.",
};

// deliveryText is a heading line followed by one quoted sentence.
const deliverySentence = deliveryText.split("\n").slice(1).join(" ").trim().replace(/^"|"$/g, "");

export default function ShippingPolicyPage() {
  return (
    <PageShell eyebrow="Policy" title="Delivery Policy">
      <div className="space-y-4 text-base leading-7 text-slate-700">
        <p>{deliverySentence}</p>
        <p>
          Plans are digital, so nothing is shipped to your home.
        </p>
        <p>
          Didn&apos;t get your certificate? Email{" "}
          <a href={`mailto:${contact.email}`} className="text-brand-blue hover:text-brand-blue-dark">
            {contact.email}
          </a>{" "}
          or call / WhatsApp {contact.phone}.
        </p>
      </div>
    </PageShell>
  );
}
