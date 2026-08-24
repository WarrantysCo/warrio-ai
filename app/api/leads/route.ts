import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import { warrantyProducts } from "@/app/data/products";
import {
  MAX_INVOICE_UPLOAD_BYTES,
  SUPPORTED_INVOICE_MIME_TYPES,
} from "@/app/lib/ai/provider";

const televisionProduct = warrantyProducts.find(
  (product) => product.id === "television"
)!;

function getValue(values: FormData | Record<string, unknown>, key: string) {
  const value = values instanceof FormData ? values.get(key) : values[key];
  return typeof value === "string" ? value.trim() : "";
}

function isSupportedInvoiceFile(file: File) {
  if (SUPPORTED_INVOICE_MIME_TYPES.has(file.type)) return true;
  return /\.(pdf|jpg|jpeg|png|webp|gif|heic|heif)$/i.test(file.name);
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

    const selectedPlanId = getValue(values, "selectedPlanId");
    const selectedPlan = televisionProduct.plans.find(
      (plan) => plan.id === selectedPlanId
    );
    const eligibilityStatus = getValue(values, "eligibilityStatus");
    const consent = getValue(values, "consent") === "true";
    const email = getValue(values, "email");
    const mobile = getValue(values, "mobile");
    const errors: string[] = [];

    if (getValue(values, "product") !== "Television") {
      errors.push("Only Television warranty requests are supported in this V1.");
    }
    if (eligibilityStatus !== "eligible") {
      errors.push("Eligibility must be confirmed before payment setup.");
    }
    if (!selectedPlan) errors.push("Please select one valid Television plan.");
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
    if (!getValue(values, "purchaseDate")) errors.push("Purchase date is required.");
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

    return NextResponse.json({
      success: true,
      leadReference: createLeadReference(),
      order: {
        product: "Television",
        planId: selectedPlan.id,
        tenure: selectedPlan.tenure,
        price: selectedPlan.price,
        currency: selectedPlan.currency,
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
