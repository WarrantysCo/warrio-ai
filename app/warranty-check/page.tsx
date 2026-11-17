import type { Metadata } from "next";

import PageShell from "@/app/components/PageShell";
import { priceCategories } from "@/app/data/priceList";

import WarrantyCheck from "./WarrantyCheck";

export const metadata: Metadata = {
  title: "Free Warranty Check & Bill Locker | Warrantys.co",
  description:
    "Upload any bill. See the date your brand warranty ends, keep the bill safe for free, and get a reminder before the warranty runs out.",
};

export default function WarrantyCheckPage() {
  return (
    <PageShell
      eyebrow="Free · takes 30 seconds"
      title="When does your warranty end?"
      intro="Upload the bill of your phone, TV, AC, fridge or any device. We show the date your brand warranty ends, keep your bill safe for free, and remind you before it runs out."
    >
      <WarrantyCheck
        categories={priceCategories.map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
        }))}
      />
    </PageShell>
  );
}
