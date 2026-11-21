import { saveContactConsent } from "@/app/lib/consent/store";
import { NextResponse } from "next/server";

import { isWithinPurchaseWindow } from "@/app/lib/agents/sales/pricing";
import { readLeads } from "@/app/lib/integrations/leadStore";
import { isSupportedInvoiceFile, MAX_INVOICE_UPLOAD_BYTES } from "@/app/lib/invoiceFile";
import { isValidWarrantyToken } from "@/app/lib/warranty/link";
import {
  readWarrantyStatus,
  saveInvoiceFile,
  saveWarrantyRecord,
} from "@/app/lib/warranty/store";
import { reportProblem } from "@/app/lib/monitoring/problems";

// Takes the details a paid customer sends from their "complete your warranty"
// page: the bill plus what the certificate prints (device, serial, dates).

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

  const leadReference = text(form, "leadReference", 40);
  if (!isValidWarrantyToken(leadReference, text(form, "token", 40))) {
    return NextResponse.json({ success: false, message: "This link is not valid." }, { status: 403 });
  }
  const lead = (await readLeads()).findLast((row) => row.lead_reference === leadReference);
  if (!lead) {
    return NextResponse.json({ success: false, message: "We could not find your order." }, { status: 404 });
  }

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
  const wantsGstInvoice = text(form, "needGstInvoice", 5) === "yes";
  const billing = {
    billing_name: text(form, "billingName"),
    billing_address: text(form, "billingAddress", 400),
    billing_state: text(form, "billingState", 60),
    buyer_gstin: text(form, "buyerGstin", 15).toUpperCase(),
  };
  const invoiceEntry = form.get("invoice");
  const invoice = invoiceEntry instanceof File && invoiceEntry.size > 0 ? invoiceEntry : null;
  const previous = (await readWarrantyStatus(leadReference)).details;

  const errors: string[] = [];
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
  if (wantsGstInvoice) {
    if (!billing.billing_name) errors.push("Please enter the name for the GST invoice.");
    if (billing.billing_address.length < 10) errors.push("Please enter the full billing address for the GST invoice.");
    if (!billing.billing_state) errors.push("Please enter the state for the GST invoice.");
    if (billing.buyer_gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(billing.buyer_gstin)) {
      errors.push("Please check the GST number (15 characters), or leave it empty.");
    }
  }
  if (!invoice && !previous?.invoice_file) {
    errors.push("Please add a photo or PDF of your purchase bill.");
  } else if (invoice && invoice.size > MAX_INVOICE_UPLOAD_BYTES) {
    errors.push("Please upload a bill smaller than 10 MB.");
  } else if (invoice && !isSupportedInvoiceFile(invoice)) {
    errors.push("The bill must be a PDF or a photo.");
  }
  if (errors.length > 0) {
    return NextResponse.json({ success: false, message: errors.join(" "), errors }, { status: 400 });
  }

  let invoiceFile = previous?.invoice_file ?? "";
  if (invoice) {
    try {
      invoiceFile = await saveInvoiceFile(leadReference, invoice);
    } catch (error) {
      await reportProblem({
        kind: "saving_failed",
        where: "/warranty form",
        message: `Could not save the bill: ${error instanceof Error ? error.message : String(error)}`,
        lead_reference: leadReference,
        mobile: details.mobile,
      });
      return NextResponse.json(
        { success: false, message: "We could not save your bill. Please try again." },
        { status: 500 }
      );
    }
  }

  // The plan was sold before we saw the bill for "pay now, send bill later",
  // so flag anything the team must check before making the certificate.
  const notes: string[] = [];
  if (!isWithinPurchaseWindow(details.device_purchase_date)) {
    notes.push("Device purchase date is outside the plan window: check eligibility, refund if not eligible.");
  }

  if (wantsGstInvoice) notes.push("Customer asked for a GST invoice: billing details are saved with this order.");

  const saved = await saveWarrantyRecord({
    type: "details",
    date: new Date().toISOString(),
    lead_reference: leadReference,
    ...details,
    ...(wantsGstInvoice ? { invoice_requested: true, ...billing } : {}),
    invoice_file: invoiceFile,
    notes_for_team: notes.join(" "),
  });
  if (!saved) {
    await reportProblem({
      kind: "saving_failed",
      where: "/warranty form",
      message: "Could not save the customer's device details.",
      lead_reference: leadReference,
      mobile: details.mobile,
    });
    return NextResponse.json(
      { success: false, message: "We could not save your details. Please try again." },
      { status: 500 }
    );
  }
  if (text(form, "contactConsent", 5) === "yes") {
    void saveContactConsent({
      source: "details-form",
      reference: leadReference,
      name: details.name,
      mobile: details.mobile,
      email: details.email,
    });
  }
  return NextResponse.json({ success: true });
}
