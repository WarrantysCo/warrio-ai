import { NextResponse } from "next/server";

import { adminAuthRequired, isAdminAllowed } from "@/app/lib/adminAuth";
import { readLeads } from "@/app/lib/integrations/leadStore";
import { readWarrantyStatuses } from "@/app/lib/warranty/store";
import { saveInvoiceEvent } from "@/app/lib/invoices/store";
import { stateCode } from "@/app/lib/invoices/states";
import { siteUrl } from "@/app/lib/warranty/link";

export const dynamic = "force-dynamic";

// Amit presses "Create invoice" for a customer who asked for one. The website
// only passes the customer's billing details to the invoice server (n8n),
// which numbers the invoice and builds the unsigned PDF. Signing and emailing
// happen only in the separate Approve & send step.
export async function POST(request: Request) {
  if (!isAdminAllowed(request)) return adminAuthRequired();

  // Built from SITE_URL, not request.url (see the certificate send route).
  const back = new URL("/admin/invoices", siteUrl());
  const fail = (message: string) => {
    back.searchParams.set("error", message);
    return NextResponse.redirect(back, 303);
  };

  const url = process.env.INVOICE_API_URL;
  if (!url) return fail("Not connected to the invoice server yet.");

  const form = await request.formData();
  const ref = String(form.get("leadReference") ?? "").trim();
  const status = (await readWarrantyStatuses()).get(ref);
  const details = status?.details;
  if (!status?.payment || !details?.invoice_requested) {
    return fail("That order has no paid invoice request.");
  }
  const lead = (await readLeads()).reverse().find((row) => row.lead_reference === ref);

  const code = stateCode(details.billing_state ?? "", details.buyer_gstin);
  if (!code) return fail(`Could not work out the GST state code for "${details.billing_state}". Please check the state.`);
  if (!lead) return fail("Could not find the order's plan and price.");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Warrio-Key": process.env.INVOICE_API_KEY ?? "" },
      body: JSON.stringify({
        action: "create",
        order_id: ref,
        customer_name: details.billing_name || details.name,
        billing_address: details.billing_address,
        state: details.billing_state,
        state_code: code,
        gstin: details.buyer_gstin ?? "",
        phone: details.mobile,
        email: details.email,
        device: `${details.brand} ${details.model}`.trim(),
        device_purchase_date: details.device_purchase_date,
        plan: lead.recommended_plan,
        price_incl_gst: lead.plan_price_inr,
        payment_mode: "Razorpay",
        payment_date: status.payment.date.slice(0, 10),
        razorpay_id: status.payment.payment_id,
        approved: false,
        send: false,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; invoice?: string; error?: string };
    if (!response.ok || !data.ok || !data.invoice) return fail(data.error || "The invoice server refused.");
    await saveInvoiceEvent({ date: new Date().toISOString(), lead_reference: ref, invoice_no: data.invoice, step: "created" });
    back.searchParams.set("done", `Invoice ${data.invoice} created (not signed or sent yet). Review it, then press Approve & send.`);
    return NextResponse.redirect(back, 303);
  } catch {
    return fail("The invoice server did not answer. Try again in a minute.");
  }
}
