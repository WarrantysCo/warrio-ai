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
      console.error("Saving invoice failed:", error instanceof Error ? error.message : error);
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

  const saved = await saveWarrantyRecord({
    type: "details",
    date: new Date().toISOString(),
    lead_reference: leadReference,
    ...details,
    invoice_file: invoiceFile,
    notes_for_team: notes.join(" "),
  });
  if (!saved) {
    return NextResponse.json(
      { success: false, message: "We could not save your details. Please try again." },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
