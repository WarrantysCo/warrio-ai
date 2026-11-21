import "server-only";

import { SchemaType, type ObjectSchema } from "@google/generative-ai/server";

import {
  AI_NOT_CONFIGURED_MESSAGE,
  createModel,
  prepareInvoicePart,
} from "@/app/lib/ai/gemini";
import { getCategoryByName } from "@/app/lib/agents/sales/pricing";
import { categoryNames } from "@/app/lib/agents/sales/instructions";
import type { InvoiceUpload } from "@/app/lib/invoiceFile";
import { reportProblem } from "@/app/lib/monitoring/problems";

// Reads one invoice (the device's own purchase bill, or the Amazon order for
// the Warrantys.co plan) with Gemini, so the customer barely has to type
// anything on /amazon-claim. Best-effort: the customer can still fill in or
// correct anything the AI missed.

const nullableString = { type: SchemaType.STRING, nullable: true } as const;

const schema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    is_invoice: { type: SchemaType.BOOLEAN },
    order_or_invoice_number: nullableString,
    invoice_date: nullableString,
    product_category: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [...categoryNames(), "Unknown"],
    },
    brand: nullableString,
    model: nullableString,
    device_name: nullableString,
    price_inr: { type: SchemaType.NUMBER, nullable: true },
  },
  required: [
    "is_invoice",
    "order_or_invoice_number",
    "invoice_date",
    "product_category",
    "brand",
    "model",
    "device_name",
    "price_inr",
  ],
};

export type ExtractedInvoice = {
  isInvoice: boolean;
  orderOrInvoiceNumber: string | null;
  date: string | null; // YYYY-MM-DD
  categoryId: string | null;
  brand: string | null;
  model: string | null;
  deviceName: string | null;
  priceInr: number | null;
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const PROMPTS: Record<"product" | "warranty", string> = {
  product: `This is a photo or PDF of a purchase invoice/bill for an electronics or appliance PRODUCT a customer bought. It may be from Amazon, Flipkart, another online store, the manufacturer, or an offline shop. Read it and return the device's brand, model, a short device name, product category, the price paid for the device (number only, in Rupees, excluding any extended warranty add-on charge), the invoice/order number, and the invoice date (YYYY-MM-DD). If this is not a product invoice, set is_invoice to false.`,
  warranty: `This is a photo or PDF of an Amazon order/invoice for a Warrantys.co EXTENDED WARRANTY PLAN (not the device itself) that a customer bought on Amazon, Warrantys.co's own marketplace listing for the plan. Read it and return the Amazon order ID (as order_or_invoice_number), the order date (YYYY-MM-DD) as invoice_date, and the price paid for the plan as price_inr. Leave brand, model, device_name and product_category null if the plan line item does not name the device. If this is not an order/invoice for a warranty plan, set is_invoice to false.`,
};

export async function extractAmazonInvoice(
  invoice: InvoiceUpload,
  kind: "product" | "warranty"
): Promise<ExtractedInvoice | { error: string }> {
  const model = createModel();
  if (!model) return { error: AI_NOT_CONFIGURED_MESSAGE };

  let cleanup: undefined | (() => Promise<void>);
  try {
    const invoicePart = await prepareInvoicePart(invoice);
    cleanup = invoicePart.cleanup;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: PROMPTS[kind] }, invoicePart.part] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: schema },
    });

    const parsed = JSON.parse(result.response.text()) as Record<string, unknown>;
    const price = typeof parsed.price_inr === "number" ? parsed.price_inr : null;
    return {
      isInvoice: parsed.is_invoice === true,
      orderOrInvoiceNumber: text(parsed.order_or_invoice_number),
      date: text(parsed.invoice_date),
      categoryId: getCategoryByName(text(parsed.product_category))?.id ?? null,
      brand: text(parsed.brand),
      model: text(parsed.model),
      deviceName: text(parsed.device_name),
      priceInr: price !== null && price > 0 ? Math.round(price) : null,
    };
  } catch (error) {
    await reportProblem({
      kind: "warrio_ai",
      where: "/amazon-claim bill reading",
      message: `Could not read an uploaded bill (customer can still type it in): ${error instanceof Error ? error.message : String(error)}`,
    });
    return { error: "We could not read that file. Please fill in the details yourself." };
  } finally {
    if (cleanup) await cleanup();
  }
}
