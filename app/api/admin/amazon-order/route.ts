import { NextResponse } from "next/server";

import { adminAuthRequired, isAdminAllowed } from "@/app/lib/adminAuth";
import { quotePlans } from "@/app/lib/agents/sales/pricing";
import { sendLeadToHubSpot } from "@/app/lib/integrations/hubspot";
import { saveLead } from "@/app/lib/integrations/leadStore";
import type { LeadRow } from "@/app/lib/integrations/n8n";
import { amazonLeadReference } from "@/app/lib/warranty/amazonLead";
import { warrantyLink } from "@/app/lib/warranty/link";

export const dynamic = "force-dynamic";

function value(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// Amit starts a certificate here for an Amazon buyer, since we may never
// email or WhatsApp them directly (never contact Amazon buyers outside
// Amazon) — the resulting link is meant to be sent through Amazon's own
// Buyer-Seller Messaging, where the customer then gives us their own email.
export async function POST(request: Request) {
  if (!isAdminAllowed(request)) return adminAuthRequired();

  const form = await request.formData();
  const amazonOrderId = value(form, "amazonOrderId");
  const categoryId = value(form, "categoryId");
  const priceInr = Number(value(form, "priceInr"));
  const tenureYears = Number(value(form, "tenureYears"));
  const fullName = value(form, "fullName") || "Amazon customer";
  const mobile = value(form, "mobile");
  const purchaseDate = value(form, "purchaseDate");

  const back = new URL("/admin/amazon", request.url);
  if (!amazonOrderId || !categoryId || !Number.isFinite(priceInr) || !tenureYears) {
    back.searchParams.set("error", "Please fill in the order ID, category, price and plan length.");
    return NextResponse.redirect(back, 303);
  }

  const plan = quotePlans(categoryId, priceInr).find((quote) => quote.tenure_years === tenureYears);
  if (!plan) {
    back.searchParams.set("error", "No plan matches that category, price and plan length.");
    return NextResponse.redirect(back, 303);
  }

  const leadReference = amazonLeadReference(amazonOrderId);
  const lead: LeadRow = {
    date: new Date().toISOString(),
    name: fullName,
    mobile,
    email: "",
    question: `Amazon order ${amazonOrderId}`,
    invoice_ok: false,
    invoice_file: "",
    seller: "Amazon",
    invoice_number: amazonOrderId,
    invoice_date: purchaseDate || null,
    name_on_invoice: fullName,
    product_category: plan.category_name,
    brand: "",
    model: "",
    serial_or_imei: "",
    price_inr: priceInr,
    days_since_purchase: null,
    recommended_plan: plan.plan_name,
    plan_price_inr: plan.price_inr,
    notes_for_team: "Created from the Amazon order page. Customer already paid on Amazon; waiting for their certificate details.",
    warrio_reply: "",
    status: "amazon_pending_details",
    source: "amazon",
    lead_reference: leadReference,
  };

  const leadWithLink = { ...lead, payment_link: "" };
  await Promise.all([saveLead(leadWithLink), sendLeadToHubSpot(leadWithLink)]);

  back.searchParams.set("created", leadReference);
  back.searchParams.set("link", warrantyLink(leadReference));
  return NextResponse.redirect(back, 303);
}
