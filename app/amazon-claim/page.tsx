import type { Metadata } from "next";

import PageShell from "@/app/components/PageShell";
import { priceCategories } from "@/app/data/priceList";

import AmazonClaimForm from "./AmazonClaimForm";

export const metadata: Metadata = {
  title: "Claim your warranty certificate | Warrantys.co",
};

export default function AmazonClaimPage() {
  return (
    <PageShell
      eyebrow="Warrantys.co"
      title="Claim your warranty certificate"
      intro="You already bought your Warrantys.co plan on Amazon. Upload your product invoice and your Amazon order for the plan — we'll read the details automatically — and we'll email your certificate."
    >
      <AmazonClaimForm
        categories={priceCategories.map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
        }))}
      />
    </PageShell>
  );
}
