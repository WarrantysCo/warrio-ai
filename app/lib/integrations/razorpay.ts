import "server-only";

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
      console.error(
        "Razorpay payment link failed:",
        response.status,
        result?.error?.description ?? ""
      );
      return null;
    }
    return /^https:\/\//.test(result.short_url) ? result.short_url : null;
  } catch (error) {
    console.error(
      "Razorpay payment link error:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
