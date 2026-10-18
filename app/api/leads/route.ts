import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import {
  daysSincePurchase,
  findPlanQuote,
  isWithinPurchaseWindow,
  quotePlans,
} from "@/app/lib/agents/sales/pricing";
import type { SalesAnalysis } from "@/app/lib/agents/sales/types";
import { sendLeadToN8n } from "@/app/lib/integrations/n8n";
import {
  isSupportedInvoiceFile,
  MAX_INVOICE_UPLOAD_BYTES,
} from "@/app/lib/invoiceFile";

function getValue(values: FormData | Record<string, unknown>, key: string) {
  const value = values instanceof FormData ? values.get(key) : values[key];
  return typeof value === "string" ? value.trim() : "";
}

// The analysis comes back from the browser, so it is only used to fill in the
// lead record. Plan, price and eligibility are checked again below.
function readAnalysis(raw: string): Partial<SalesAnalysis> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function createLeadReference() {
  return `WAR-LEAD-${randomInt(0, 1_000_000).toString().padStart(6, "0")}`;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let values: FormData | Record<string, unknown>;
    let invoice: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      values = formData;
      const invoiceEntry = formData.get("invoice");
      invoice = invoiceEntry instanceof File && invoiceEntry.size > 0
        ? invoiceEntry
        : null;
    } else {
      values = await request.json();
    }

    const selectedPlan = findPlanQuote(getValue(values, "selectedPlanId"));
    const priceInr = Number(getValue(values, "priceInr"));
    const purchaseDate = getValue(values, "purchaseDate");
    const consent = getValue(values, "consent") === "true";
    const email = getValue(values, "email");
    const mobile = getValue(values, "mobile");
    const errors: string[] = [];

    if (!selectedPlan) {
      errors.push("Please select one valid plan.");
    } else if (
      !Number.isFinite(priceInr) ||
      !quotePlans(selectedPlan.category_id, priceInr).some(
        (plan) => plan.id === selectedPlan.id
      )
    ) {
      errors.push("The selected plan does not match the device price.");
    }
    if (!getValue(values, "fullName")) errors.push("Full name is required.");
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      errors.push("A valid 10-digit mobile number is required.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("A valid email address is required.");
    }
    if (!getValue(values, "brand")) errors.push("Brand is required.");
    if (!getValue(values, "model")) errors.push("Model is required.");
    if (!getValue(values, "serialNumber")) errors.push("Serial number is required.");
    if (!purchaseDate) {
      errors.push("Purchase date is required.");
    } else if (
      (daysSincePurchase(purchaseDate) ?? -1) < 0 ||
      !isWithinPurchaseWindow(purchaseDate)
    ) {
      errors.push("The purchase date is outside the plan window.");
    }
    if (!consent) errors.push("Consent is required to proceed.");

    if (invoice && invoice.size > MAX_INVOICE_UPLOAD_BYTES) {
      errors.push("Please upload an invoice smaller than 10 MB.");
    } else if (invoice && !isSupportedInvoiceFile(invoice)) {
      errors.push("Invoice must be a PDF or common image format.");
    }

    if (errors.length > 0 || !selectedPlan) {
      return NextResponse.json(
        { success: false, message: errors.join(" "), errors },
        { status: 400 }
      );
    }

    const leadReference = createLeadReference();
    const analysis = readAnalysis(getValue(values, "analysis"));

    const n8n = await sendLeadToN8n({
      date: new Date().toISOString(),
      name: getValue(values, "fullName"),
      mobile,
      email,
      question: getValue(values, "question"),
      invoice_ok: analysis.is_invoice === true,
      invoice_file: invoice?.name ?? "",
      seller: analysis.invoice?.seller ?? null,
      invoice_number: analysis.invoice?.invoice_number ?? null,
      invoice_date: analysis.invoice?.invoice_date ?? null,
      name_on_invoice: analysis.invoice?.name_on_invoice ?? null,
      product_category: selectedPlan.category_name,
      brand: getValue(values, "brand"),
      model: getValue(values, "model"),
      serial_or_imei: getValue(values, "serialNumber"),
      price_inr: priceInr,
      days_since_purchase: daysSincePurchase(purchaseDate),
      recommended_plan: selectedPlan.plan_name,
      plan_price_inr: selectedPlan.price_inr,
      notes_for_team:
        typeof analysis.notes_for_team === "string" ? analysis.notes_for_team : "",
      warrio_reply: typeof analysis.reply === "string" ? analysis.reply : "",
      status: "new",
      source: "website",
      lead_reference: leadReference,
    });

    return NextResponse.json({
      success: true,
      leadReference,
      n8n,
      order: {
        product: selectedPlan.category_name,
        planId: selectedPlan.id,
        tenureYears: selectedPlan.tenure_years,
        price: selectedPlan.price_inr,
        currency: "INR",
        invoiceStatus: invoice ? "received" : "not_uploaded",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "We could not validate your request." },
      { status: 400 }
    );
  }
}
