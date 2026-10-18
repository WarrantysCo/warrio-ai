import "server-only";

import { SchemaType, type ObjectSchema } from "@google/generative-ai/server";

import {
  AI_NOT_CONFIGURED_MESSAGE,
  AI_UNAVAILABLE_MESSAGE,
  createModel,
  getErrorMessage,
  prepareInvoicePart,
} from "../../ai/gemini";
import type { InvoiceUpload } from "../../invoiceFile";
import { buildVerifiedDataBlock } from "../knowledge";
import type { AgentRequest, AgentResponse, WarrioAgent } from "../types";
import {
  buildExtractionPrompt,
  buildReplyPrompt,
  categoryNames,
} from "./instructions";
import { decideSale, getCategory, getCategoryByName } from "./pricing";
import type { InvoiceDetails, SalesAnalysis, SalesDecision } from "./types";

const nullableString = { type: SchemaType.STRING, nullable: true } as const;

const extractionSchema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    is_invoice: { type: SchemaType.BOOLEAN },
    seller: nullableString,
    invoice_number: nullableString,
    invoice_date: nullableString,
    name_on_invoice: nullableString,
    product_category: {
      type: SchemaType.STRING,
      format: "enum",
      enum: categoryNames(),
    },
    brand: nullableString,
    model: nullableString,
    serial_or_imei: nullableString,
    price_inr: { type: SchemaType.NUMBER, nullable: true },
    purchase_country: nullableString,
    customer_language: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["english", "hindi", "hinglish"],
    },
    notes_for_team: { type: SchemaType.STRING },
  },
  required: [
    "is_invoice",
    "seller",
    "invoice_number",
    "invoice_date",
    "name_on_invoice",
    "product_category",
    "brand",
    "model",
    "serial_or_imei",
    "price_inr",
    "purchase_country",
    "customer_language",
    "notes_for_team",
  ],
};

type Extraction = {
  isInvoice: boolean;
  invoice: InvoiceDetails;
  language: string;
  aiNotes: string;
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseExtraction(rawText: string): Extraction {
  const parsed = JSON.parse(rawText) as Record<string, unknown>;
  const price = typeof parsed.price_inr === "number" ? parsed.price_inr : null;
  const category = getCategoryByName(text(parsed.product_category));

  return {
    isInvoice: parsed.is_invoice === true,
    invoice: {
      seller: text(parsed.seller),
      invoice_number: text(parsed.invoice_number),
      invoice_date: text(parsed.invoice_date),
      name_on_invoice: text(parsed.name_on_invoice),
      product_category: category?.id ?? "other",
      brand: text(parsed.brand),
      model: text(parsed.model),
      serial_or_imei: text(parsed.serial_or_imei),
      price_inr: price !== null && price > 0 ? Math.round(price) : null,
      purchase_country: text(parsed.purchase_country),
    },
    language: text(parsed.customer_language) ?? "english",
    aiNotes: text(parsed.notes_for_team) ?? "",
  };
}

function firstName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] || null;
}

// Used when the AI reply step fails, so the customer still gets a correct answer.
function fallbackReply(
  invoice: InvoiceDetails,
  decision: SalesDecision,
  customerName?: string
) {
  const name = firstName(customerName) ?? firstName(invoice.name_on_invoice);
  const greeting = name ? `Hi ${name},` : "Hi,";
  const device = [invoice.brand, invoice.model].filter(Boolean).join(" ");

  if (decision.eligibility_status !== "eligible" || !decision.recommended_plan) {
    return `${greeting}\nThank you for sharing your invoice${device ? ` for your ${device}` : ""}.\nA team member from Warrantys.co will check the details and call you shortly.`;
  }

  return `${greeting}\nI can see your ${device || getCategory(invoice.product_category)?.name}${invoice.price_inr ? ` bought for Rs ${invoice.price_inr.toLocaleString("en-IN")}` : ""}.\nI recommend the ${decision.recommended_plan} for Rs ${decision.plan_price_inr?.toLocaleString("en-IN")}.\nIt covers repairs of manufacturing and electrical faults after the brand warranty ends.\nReply YES and our team will send you the payment link.`;
}

const NOT_INVOICE_REPLY =
  "Hi! I could not read the device details from this file. Please upload a clear photo or PDF of the full purchase invoice, and I will suggest the right plan for you.";

export async function analyzeInvoice(input: {
  message: string;
  customerName?: string;
  invoice: InvoiceUpload;
  now?: Date;
}): Promise<AgentResponse> {
  const model = createModel();

  if (!model) {
    return { success: false, agent: "sales", message: AI_NOT_CONFIGURED_MESSAGE };
  }

  const now = input.now ?? new Date();
  let cleanup: undefined | (() => Promise<void>);

  try {
    const invoicePart = await prepareInvoicePart(input.invoice);
    cleanup = invoicePart.cleanup;

    const extracted = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildExtractionPrompt({
                message: input.message,
                customerName: input.customerName,
                today: now.toISOString().slice(0, 10),
              }),
            },
            invoicePart.part,
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
        maxOutputTokens: 1024,
      },
    });

    const extraction = parseExtraction(extracted.response.text());
    const decision = decideSale(extraction.invoice, now);
    const { team_notes: teamNotes, ...decisionFields } = decision;
    const notes = [extraction.aiNotes, ...teamNotes].filter(Boolean).join(" ");

    let reply = NOT_INVOICE_REPLY;

    if (extraction.isInvoice) {
      reply = fallbackReply(extraction.invoice, decision, input.customerName);

      try {
        const written = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: buildReplyPrompt({
                    message: input.message,
                    customerName: input.customerName,
                    language: extraction.language,
                    invoice: extraction.invoice,
                    categoryName:
                      getCategory(extraction.invoice.product_category)?.name ?? null,
                    decision,
                  }),
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
        });
        reply = written.response.text().trim() || reply;
      } catch (error) {
        console.error("Sales reply error:", getErrorMessage(error));
      }
    }

    const analysis: SalesAnalysis = {
      is_invoice: extraction.isInvoice,
      invoice: extraction.invoice,
      ...(extraction.isInvoice
        ? decisionFields
        : {
            ...decisionFields,
            eligibility_status: "cannot_confirm" as const,
            eligibility_message: "The file could not be read as an invoice.",
            recommended_plan_id: null,
            recommended_plan: null,
            plan_price_inr: null,
            plan_options: [],
          }),
      notes_for_team: notes,
      reply,
    };

    return { success: true, agent: "sales", message: reply, analysis };
  } catch (error) {
    console.error("Sales invoice error:", getErrorMessage(error));
    return { success: false, agent: "sales", message: AI_UNAVAILABLE_MESSAGE };
  } finally {
    if (cleanup) await cleanup();
  }
}

function buildChatInstruction() {
  return `You are Warrio, the friendly sales assistant for Warrantys.co (Deetya Warranty Private Limited), an Indian company selling extended warranty plans for electronics and home appliances.

Help the customer pick the right plan. The exact price depends on the device price on their invoice, so when they want a plan, ask them to upload their purchase invoice. Keep answers to 5 to 8 short lines, in the customer's language (English, Hindi or Hinglish).

${buildVerifiedDataBlock()}`;
}

async function answerQuestion(request: AgentRequest): Promise<AgentResponse> {
  const model = createModel(buildChatInstruction());

  if (!model) {
    return { success: false, agent: "sales", message: AI_NOT_CONFIGURED_MESSAGE };
  }

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: request.selectedProduct
                ? `Product the customer picked: ${request.selectedProduct}\n\n${request.message}`
                : request.message,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.4 },
    });

    return { success: true, agent: "sales", message: result.response.text() };
  } catch (error) {
    console.error("Sales chat error:", getErrorMessage(error));
    return { success: false, agent: "sales", message: AI_UNAVAILABLE_MESSAGE };
  }
}

export const salesAgent: WarrioAgent = {
  id: "sales",
  title: "Sales",
  job: "Reads the customer's invoice, recommends a plan and creates the lead.",
  status: "live",
  handle: (request) =>
    request.invoice
      ? analyzeInvoice({
          message: request.message,
          customerName: request.customerName,
          invoice: request.invoice,
        })
      : answerQuestion(request),
};
