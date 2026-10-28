import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { reportProblem } from "@/app/lib/monitoring/problems";

// Makes a Razorpay payment link for one order, the same way the n8n workflow
// does. Needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET; without them, or if
// Razorpay refuses, it returns null and the customer is sent to WhatsApp.
// RAZORPAY_TEST_AMOUNT_INR charges that amount instead, only for testing.

export type PaymentLinkRequest = {
  priceInr: number;
  planName: string;
  device: string;
  name: string;
  mobile: string;
  email: string;
  leadReference: string;
  // Where Razorpay sends the customer after paying.
  callbackUrl?: string;
};

export async function createPaymentLink(
  order: PaymentLinkRequest
): Promise<string | null> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;

  const testAmount = Math.round(Number(process.env.RAZORPAY_TEST_AMOUNT_INR));
  const amountInr = testAmount > 0 ? testAmount : order.priceInr;

  try {
    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        // Razorpay wants paise and the mobile with its country code.
        amount: amountInr * 100,
        currency: "INR",
        accept_partial: false,
        reference_id: order.leadReference,
        description: `${testAmount > 0 ? "TEST PAYMENT - " : ""}Warrantys.co ${order.planName} for your ${order.device}`.slice(0, 2048),
        customer: {
          name: order.name,
          contact: `+91${order.mobile}`,
          ...(order.email ? { email: order.email } : {}),
        },
        notify: { sms: false, email: false },
        reminder_enable: false,
        ...(order.callbackUrl
          ? { callback_url: order.callbackUrl, callback_method: "get" }
          : {}),
        notes: {
          plan: order.planName,
          device: order.device,
          mobile: order.mobile,
          lead_reference: order.leadReference,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.short_url !== "string") {
      await reportProblem({
        kind: "payment_link",
        where: "/api/leads",
        message: `Razorpay said ${response.status}: ${result?.error?.description ?? "no reason given"}`,
        lead_reference: order.leadReference,
        mobile: order.mobile,
      });
      return null;
    }
    return /^https:\/\//.test(result.short_url) ? result.short_url : null;
  } catch (error) {
    await reportProblem({
      kind: "payment_link",
      where: "/api/leads",
      message: `Could not reach Razorpay: ${error instanceof Error ? error.message : String(error)}`,
      lead_reference: order.leadReference,
      mobile: order.mobile,
    });
    return null;
  }
}

export type PaymentCallback = {
  razorpay_payment_id?: string;
  razorpay_payment_link_id?: string;
  razorpay_payment_link_reference_id?: string;
  razorpay_payment_link_status?: string;
  razorpay_signature?: string;
};

// Razorpay adds these to the callback URL after a payment. The signature proves
// they came from Razorpay and that this lead's link was really paid.
export function isPaidCallback(callback: PaymentCallback, leadReference: string) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const {
    razorpay_payment_id: paymentId,
    razorpay_payment_link_id: linkId,
    razorpay_payment_link_reference_id: referenceId,
    razorpay_payment_link_status: status,
    razorpay_signature: signature,
  } = callback;
  if (!keySecret || !paymentId || !linkId || !signature) return false;
  if (referenceId !== leadReference || status !== "paid") return false;

  const expected = createHmac("sha256", keySecret)
    .update(`${linkId}|${referenceId}|${status}|${paymentId}`)
    .digest("hex");
  return (
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}
