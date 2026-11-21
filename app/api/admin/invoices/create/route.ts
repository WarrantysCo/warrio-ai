import { NextResponse } from "next/server";

import { adminAuthRequired, isAdminAllowed } from "@/app/lib/adminAuth";
import { readLeads } from "@/app/lib/integrations/leadStore";
import { readWarrantyStatuses } from "@/app/lib/warranty/store";
import { siteUrl } from "@/app/lib/warranty/link";

export const dynamic = "force-dynamic";

// Amit presses "Create invoice" for a customer who asked for one. The website
// only passes the customer's billing details to the invoice server (n8n),
// which numbers the invoice and builds the PDF. It never signs or emails:
// the signature needs Amit's separate approval, and sending is a later step.
export async function POST(request: Request) {
  if (!isAdminAllowed(request)) return adminAuthRequired();

  // Built from SITE_URL, not request.url (see the certificate send route).
  const back = new URL("/admin/invoices", siteUrl());
  const fail = (message: string) => {
    back.searchParams.set("error", message);
    return NextResponse.redirect(back, 303);
  };

  const url = process.env.N8N_INVOICE_CREATE_URL;
  if (!url) return fail("Not connected to the invoice server yet.");

  const form = await request.formData();
  const ref = String(form.get("leadReference") ?? "").trim();
  const status = (await readWarrantyStatuses()).get(ref);
  const details = status?.details;
  if (!status?.payment || !details?.invoice_requested) {
    return fail("That order has no paid invoice request.");
  }
  const lead = (await readLeads()).reverse().find((row) => row.lead_reference === ref);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.N8N_WEBHOOK_SECRET) headers["X-Warrio-Secret"] = process.env.N8N_WEBHOOK_SECRET;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        order_id: ref,
        customer_name: details.billing_name || details.name,
        billing_address: details.billing_address,
        state: details.billing_state,
        customer_gstin: details.buyer_gstin ?? "",
        phone: details.mobile,
        email: details.email,
        device: `${details.brand} ${details.model}`.trim(),
        device_purchase_date: details.device_purchase_date,
        plan: lead?.recommended_plan ?? "",
        plan_price_incl_gst: lead?.plan_price_inr ?? 0,
        payment_id: status.payment.payment_id,
        payment_date: status.payment.date,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const text = (await response.text()).slice(0, 200);
    if (!response.ok || /^NOT MADE/i.test(text)) return fail(text || "The invoice server refused.");
    back.searchParams.set("done", text || `Invoice created for ${ref}.`);
    return NextResponse.redirect(back, 303);
  } catch {
    return fail("The invoice server did not answer. Try again in a minute.");
  }
}
