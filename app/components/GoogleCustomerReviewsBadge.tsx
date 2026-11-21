"use client";

import Script from "next/script";

// Google's floating seller-rating badge, shown on every page.
// https://support.google.com/merchants/answer/14632921
const MERCHANT_ID = 5608990076;

export default function GoogleCustomerReviewsBadge() {
  return (
    <Script
      id="gcr-badge"
      src="https://www.gstatic.com/shopping/merchant/merchantwidget.js"
      strategy="afterInteractive"
      onLoad={() => {
        window.merchantwidget?.start({
          merchant_id: MERCHANT_ID,
          position: "BOTTOM_LEFT",
          region: "IN",
        });
      }}
    />
  );
}

declare global {
  interface Window {
    merchantwidget?: {
      start: (options: { merchant_id: number; position?: string; region?: string }) => void;
    };
  }
}
