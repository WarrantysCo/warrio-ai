"use client";

import Script from "next/script";

// Shows Google's post-purchase review opt-in survey once a plan is paid for.
// https://support.google.com/merchants/answer/14629205
// Requires an email (Google emails the survey), so this renders nothing for
// phone-only "pay now, send bill later" leads that never gave one.
const MERCHANT_ID = 5608990076;

export default function GoogleCustomerReviewsOptIn({
  orderId,
  email,
  estimatedDeliveryDate,
}: {
  orderId: string;
  email: string;
  estimatedDeliveryDate: string;
}) {
  if (!email) return null;

  const optIn = {
    merchant_id: MERCHANT_ID,
    order_id: orderId,
    email,
    delivery_country: "IN",
    estimated_delivery_date: estimatedDeliveryDate,
  };

  return (
    <>
      <Script id="gcr-opt-in-init" strategy="afterInteractive">
        {`window.renderOptIn=function(){window.gapi.load('surveyoptin',function(){window.gapi.surveyoptin.render(${JSON.stringify(optIn)});});};`}
      </Script>
      <Script src="https://apis.google.com/js/platform.js?onload=renderOptIn" strategy="afterInteractive" />
    </>
  );
}
