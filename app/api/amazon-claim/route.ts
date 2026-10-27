import { NextResponse } from "next/server";

import { isWithinPurchaseWindow, quotePlans } from "@/app/lib/agents/sales/pricing";
import { sendLeadToHubSpot } from "@/app/lib/integrations/hubspot";
import { saveLead } from "@/app/lib/integrations/leadStore";
import type { LeadRow } from "@/app/lib/integrations/n8n";
import { isSupportedInvoiceFile, MAX_INVOICE_UPLOAD_BYTES } from "@/app/lib/invoiceFile";
import { amazonLeadReference } from "@/app/lib/warranty/amazonLead";
import { readWarrantyStatus, saveInvoiceFile, saveWarrantyRecord } from "@/app/lib/warranty/store";

export const dynamic = "force-dynamic";

// The public form a customer fills in directly after buying a Warrantys.co
// plan on Amazon (replacing a 3rd-party Google Form). The product itself can
// be from anywhere (Amazon, Flipkart, a shop, the manufacturer); only the
// plan purchase is the Amazon order.

function text(form: FormData, key: string, max = 200) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function file(form: FormData, key: string) {
  const value = form.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

// Picks the plan whose price is closest to what the customer actually paid
// for it, so the customer never has to pick a plan length themselves.
function closestPlan(categoryId: string, devicePriceInr: number, warrantyPriceInr: number) {
  const options = quotePlans(categoryId, devicePriceInr);
  if (options.length === 0) return null;
  return options.reduce((best, option) =>
    Math.abs(option.price_inr - warrantyPriceInr) < Math.abs(best.price_inr - warrantyPriceInr)
      ? option
      : best
  );
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
  const warrantyPriceInr = Number(text(form, "warrantyPriceInr", 12));
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

  const productInvoice = file(form, "productInvoice");
  const warrantyInvoice = file(form, "warrantyInvoice");
  const photo1 = file(form, "conditionPhoto1");
  const photo2 = file(form, "conditionPhoto2");

  const errors: string[] = [];
  if (!amazonOrderId) errors.push("Please enter your Amazon order ID for the plan.");
  if (!Number.isFinite(priceInr) || priceInr <= 0) errors.push("Please share your product's purchase invoice so we can read the price.");
  const plan =
    Number.isFinite(priceInr) && Number.isFinite(warrantyPriceInr)
      ? closestPlan(categoryId, priceInr, warrantyPriceInr)
      : null;
  if (!plan) errors.push("We could not match a plan to your category and price. Please check your invoices.");
  if (!details.name) errors.push("Please enter your full name.");
  if (!/^[6-9]\d{9}$/.test(details.mobile)) errors.push("Please enter a valid 10-digit mobile number.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) errors.push("Please enter a valid email address.");
  if (!details.serial_or_imei) errors.push("Please enter the serial number or IMEI.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(details.device_purchase_date)) {
    errors.push("We could not read the device purchase date. Please check your product invoice.");
  } else if (new Date(`${details.device_purchase_date}T00:00:00Z`) > new Date()) {
    errors.push("The purchase date cannot be in the future.");
  }

  const leadReference = amazonOrderId ? amazonLeadReference(amazonOrderId) : "";
  const previous = leadReference ? (await readWarrantyStatus(leadReference)).details : undefined;

  for (const [label, uploaded, existing] of [
    ["product invoice", productInvoice, previous?.invoice_file] as const,
    ["Amazon plan order", warrantyInvoice, previous?.warranty_invoice_file] as const,
  ]) {
    if (!uploaded && !existing) {
      errors.push(`Please upload your ${label}.`);
    } else if (uploaded && uploaded.size > MAX_INVOICE_UPLOAD_BYTES) {
      errors.push(`Please upload a ${label} smaller than 10 MB.`);
    } else if (uploaded && !isSupportedInvoiceFile(uploaded)) {
      errors.push(`Your ${label} must be a PDF or a photo.`);
    }
  }
  if ((photo1 || photo2) && [photo1, photo2].some((p) => p && !isSupportedInvoiceFile(p))) {
    errors.push("Product photos must be common image files.");
  }

  if (errors.length > 0 || !plan) {
    return NextResponse.json({ success: false, message: errors.join(" "), errors }, { status: 400 });
  }

  const notes: string[] = ["Submitted directly by the customer via the self-serve claim form."];
  if (!isWithinPurchaseWindow(details.device_purchase_date)) {
    notes.push("Device purchase date is outside the plan window: check eligibility, refund if not eligible.");
  }

  const lead: LeadRow = {
    date: new Date().toISOString(),
    name: details.name,
    mobile: details.mobile,
    email: details.email,
    question: `Amazon plan order ${amazonOrderId}`,
    invoice_ok: false,
    invoice_file: "",
    seller: "Amazon (plan); product from customer's own invoice",
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

  try {
    const [invoiceFile, warrantyInvoiceFile, photo1File, photo2File] = await Promise.all([
      productInvoice ? saveInvoiceFile(leadReference, productInvoice, "product") : previous?.invoice_file ?? "",
      warrantyInvoice
        ? saveInvoiceFile(leadReference, warrantyInvoice, "warranty")
        : previous?.warranty_invoice_file ?? "",
      photo1 ? saveInvoiceFile(leadReference, photo1, "photo1") : undefined,
      photo2 ? saveInvoiceFile(leadReference, photo2, "photo2") : undefined,
    ]);

    const conditionPhotos = [photo1File, photo2File, ...(previous?.condition_photos ?? [])].filter(
      (name): name is string => Boolean(name)
    );

    const [leadSaved, detailsSaved] = await Promise.all([
      saveLead({ ...lead, payment_link: "" }),
      saveWarrantyRecord({
        type: "details",
        date: new Date().toISOString(),
        lead_reference: leadReference,
        ...details,
        invoice_file: invoiceFile,
        warranty_invoice_file: warrantyInvoiceFile,
        condition_photos: conditionPhotos,
        notes_for_team: notes.join(" "),
      }),
    ]);
    if (!leadSaved || !detailsSaved) {
      return NextResponse.json(
        { success: false, message: "We could not save your details. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Saving Amazon claim failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, message: "We could not save your files. Please try again." },
      { status: 500 }
    );
  }

  await sendLeadToHubSpot({ ...lead, payment_link: "" });

  return NextResponse.json({ success: true, leadReference });
}
