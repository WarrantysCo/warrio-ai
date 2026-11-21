"use client";

import { useEffect } from "react";

import { trackEvent } from "@/app/lib/analytics";

// Records one "purchase" per paid order, even if the page is reloaded.
export default function TrackPurchase({ leadReference, value }: { leadReference: string; value: number }) {
  useEffect(() => {
    const key = `ga_purchase_${leadReference}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // Storage blocked: still send once for this view.
    }
    trackEvent("purchase", { transaction_id: leadReference, value, currency: "INR" });
  }, [leadReference, value]);

  return null;
}
