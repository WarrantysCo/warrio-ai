import type { Metadata } from "next";

import PageShell from "@/app/components/PageShell";
import { priceCategories } from "@/app/data/priceList";

import AmazonClaimForm from "./AmazonClaimForm";

export const metadata: Metadata = {
  title: "Claim your Amazon warranty | Warrantys.co",
};

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AmazonClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;

  return (
    <PageShell
      eyebrow="Warrantys.co for Amazon"
      title="Claim your warranty certificate"
      intro="You already paid for your plan on Amazon. Tell us a few details about your device and bill, and we will email your certificate."
    >
      <AmazonClaimForm
        categories={priceCategories.map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
        }))}
        initial={{
          amazonOrderId: first(query.order),
          categoryId: first(query.category),
          priceInr: first(query.price),
          tenureYears: first(query.years),
          fullName: first(query.name),
        }}
      />
    </PageShell>
  );
}
