import { NextResponse } from "next/server";

import { isWithinPurchaseWindow } from "@/app/lib/agents/sales/pricing";
import { quotePlans } from "@/app/lib/agents/sales/pricing";
import { sendLeadToHubSpot } from "@/app/lib/integrations/hubspot";
import { saveLead } from "@/app/lib/integrations/leadStore";
import type { LeadRow } from "@/app/lib/integrations/n8n";
import { isSupportedInvoiceFile, MAX_INVOICE_UPLOAD_BYTES } from "@/app/lib/invoiceFile";
import { amazonLeadReference } from "@/app/lib/warranty/amazonLead";
import { readWarrantyStatus, saveInvoiceFile, saveWarrantyRecord } from "@/app/lib/warranty/store";

export const dynamic = "force-dynamic";

// The public form an Amazon customer fills in directly (replacing a 3rd-party
// Google Form) after their order email tells them to. No admin step first:
// this both creates the lead and takes the certificate details in one go.

function text(form: FormData, key: string, max = 200) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ success: false, message: "We could not read your form." }, { status: 400 });
  }

  const amazonOrderId = text(form, "amazonOrderId", 40);
  const categoryId = text(form, "categoryId", 40);
  const priceInr = Number(text(form, "priceInr", 12));
  const tenureYears = Number(text(form, "tenureYears", 2));
  const details = {
    name: text(form, "fullName"),
    mobile: text(form, "mobile", 20),
    email: text(form, "email"),
    device_name: text(form, "deviceName"),
    brand: text(form, "brand"),
    model: text(form, "model"),
    serial_or_imei: text(form, "serialNumber", 60),
    device_purchase_date: text(form, "purchaseDate", 10),
  };
  const invoiceEntry = form.get("invoice");
  const invoice = invoiceEntry instanceof File && invoiceEntry.size > 0 ? invoiceEntry : null;

  const errors: string[] = [];
  if (!amazonOrderId) errors.push("Please enter your Amazon order ID.");
  const plan = quotePlans(categoryId, priceInr).find((quote) => quote.tenure_years === tenureYears);
  if (!plan) errors.push("Please select the product, price and plan length you bought on Amazon.");
  if (!details.name) errors.push("Please enter your full name.");
  if (!/^[6-9]\d{9}$/.test(details.mobile)) errors.push("Please enter a valid 10-digit mobile number.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) errors.push("Please enter a valid email address.");
  if (!details.device_name) errors.push("Please enter the device name.");
  if (!details.brand) errors.push("Please enter the brand.");
  if (!details.model) errors.push("Please enter the model.");
  if (!details.serial_or_imei) errors.push("Please enter the serial number or IMEI.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(details.device_purchase_date)) {
    errors.push("Please enter the date you bought the device.");
  } else if (new Date(`${details.device_purchase_date}T00:00:00Z`) > new Date()) {
    errors.push("The purchase date cannot be in the future.");
  }
  const leadReference = amazonOrderId ? amazonLeadReference(amazonOrderId) : "";
  const previous = leadReference ? (await readWarrantyStatus(leadReference)).details : undefined;
  if (!invoice && !previous?.invoice_file) {
    errors.push("Please add a photo or PDF of your Amazon invoice.");
  } else if (invoice && invoice.size > MAX_INVOICE_UPLOAD_BYTES) {
    errors.push("Please upload a bill smaller than 10 MB.");
  } else if (invoice && !isSupportedInvoiceFile(invoice)) {
    errors.push("The bill must be a PDF or a photo.");
  }
  if (errors.length > 0 || !plan) {
    return NextResponse.json({ success: false, message: errors.join(" "), errors }, { status: 400 });
  }

  const notes: string[] = ["Submitted directly by the customer via the Amazon claim form."];
  if (!isWithinPurchaseWindow(details.device_purchase_date)) {
    notes.push("Device purchase date is outside the plan window: check eligibility, refund if not eligible.");
  }

  const lead: LeadRow = {
    date: new Date().toISOString(),
    name: details.name,
    mobile: details.mobile,
    email: details.email,
    question: `Amazon order ${amazonOrderId}`,
    invoice_ok: false,
    invoice_file: "",
    seller: "Amazon",
    invoice_number: amazonOrderId,
    invoice_date: details.device_purchase_date || null,
    name_on_invoice: details.name,
    product_category: plan.category_name,
    brand: details.brand,
    model: details.model,
    serial_or_imei: details.serial_or_imei,
    price_inr: priceInr,
    days_since_purchase: null,
    recommended_plan: plan.plan_name,
    plan_price_inr: plan.price_inr,
    notes_for_team: notes.join(" "),
    warrio_reply: "",
    status: "amazon_pending_details",
    source: "amazon",
    lead_reference: leadReference,
  };

  let invoiceFile = previous?.invoice_file ?? "";
  if (invoice) {
    try {
      invoiceFile = await saveInvoiceFile(leadReference, invoice);
    } catch (error) {
      console.error("Saving Amazon invoice failed:", error instanceof Error ? error.message : error);
      return NextResponse.json(
        { success: false, message: "We could not save your bill. Please try again." },
        { status: 500 }
      );
    }
  }

  const [leadSaved, detailsSaved] = await Promise.all([
    saveLead({ ...lead, payment_link: "" }),
    saveWarrantyRecord({
      type: "details",
      date: new Date().toISOString(),
      lead_reference: leadReference,
      ...details,
      invoice_file: invoiceFile,
      notes_for_team: notes.join(" "),
    }),
  ]);
  if (!leadSaved || !detailsSaved) {
    return NextResponse.json(
      { success: false, message: "We could not save your details. Please try again." },
      { status: 500 }
    );
  }
  await sendLeadToHubSpot({ ...lead, payment_link: "" });

  return NextResponse.json({ success: true, leadReference });
}
