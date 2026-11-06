import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { readLeads } from "@/app/lib/integrations/leadStore";
import { reportProblem } from "@/app/lib/monitoring/problems";
import { readWarrantyStatus, saveWarrantyRecord } from "@/app/lib/warranty/store";

// Razorpay calls this itself after every payment, so a payment is recorded
// even when the customer closes their phone before Razorpay brings them back
// to our form (until now we only learnt of a payment from that redirect).
// Set up in Razorpay Dashboard > Account & Settings > Webhooks with the
// events payment_link.paid and payment.failed, and the same secret as
// RAZORPAY_WEBHOOK_SECRET on Hostinger.

export const dynamic = "force-dynamic";

type Entity = Record<string, unknown>;

function entity(payload: unknown, key: string): Entity {
  const value = (payload as Record<string, { entity?: Entity }> | undefined)?.[key]?.entity;
  return value && typeof value === "object" ? value : {};
}

function str(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isFromRazorpay(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return (
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  if (!isFromRazorpay(body, request.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let event: { event?: string; payload?: unknown };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (event.event === "payment_link.paid") {
    const link = entity(event.payload, "payment_link");
    const payment = entity(event.payload, "payment");
    const leadReference = str(link.reference_id);
    const paymentId = str(payment.id);
    if (leadReference && paymentId) {
      const status = await readWarrantyStatus(leadReference);
      if (status.payment?.payment_id !== paymentId) {
        const saved = await saveWarrantyRecord({
          type: "payment",
          date: new Date().toISOString(),
          lead_reference: leadReference,
          payment_id: paymentId,
          payment_link_id: str(link.id),
        });
        // A 500 makes Razorpay try again later.
        if (!saved) return NextResponse.json({ ok: false }, { status: 500 });
      }
    }
  }

  if (event.event === "payment.failed") {
    const payment = entity(event.payload, "payment");
    const notes = (payment.notes && typeof payment.notes === "object" ? payment.notes : {}) as Entity;
    const mobile = str(payment.contact).replace(/^\+91/, "");
    // Payment-link payments do not always carry our reference, so fall back
    // to the latest order from the same mobile number.
    const leadReference =
      str(notes.lead_reference) ||
      (mobile
        ? (await readLeads()).findLast((lead) => lead.mobile === mobile)?.lead_reference
        : undefined);
    await reportProblem({
      kind: "payment_failed",
      where: "Razorpay",
      message: str(payment.error_description) || "Payment failed, no reason given.",
      lead_reference: leadReference,
      mobile,
    });
  }

  return NextResponse.json({ ok: true });
}
