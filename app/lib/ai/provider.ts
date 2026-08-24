import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  FileState,
  GoogleAIFileManager,
  SchemaType,
  type ObjectSchema,
  type Part,
} from "@google/generative-ai/server";

import { warrantyProducts } from "../../data/products";
import { warrantyTerms } from "../../data/warrantyTerms";

const televisionProduct = warrantyProducts.find(
  (product) => product.id === "television"
)!;

const apiKey = process.env.GEMINI_API_KEY;

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const fileManager = apiKey ? new GoogleAIFileManager(apiKey) : null;

const MODEL_NAME = "gemini-3.1-flash-lite";
const FILE_POLL_INTERVAL_MS = 1_000;
const FILE_POLL_TIMEOUT_MS = 15_000;

export const MAX_INVOICE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const SUPPORTED_INVOICE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

type InvoiceUpload = {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
};

export type InvoiceSummary = {
  seller: string | null;
  invoiceDateText: string | null;
  invoiceDateNormalized: string | null;
  invoiceNumber: string | null;
  product: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  invoiceValue: string | null;
  currency: string | null;
  purchaseLocationCountry: string | null;
  matchedProductCategory: string | null;
  missingDetails: string[];
  notes: string | null;
};

export type PurchaseWindowStatus =
  | "appears_within_window"
  | "appears_outside_window"
  | "cannot_confirm";

export type EligibilityStatus = "eligible" | "ineligible" | "cannot_confirm";

export type InvoiceAnalysis = {
  summary: InvoiceSummary;
  purchaseWindowStatus: PurchaseWindowStatus;
  eligibilityStatus: EligibilityStatus;
  eligibilityMessage: string;
  recommendedPlanId: string | null;
  availablePlanIds: string[];
};

type InvoiceAnalysisContext = {
  summary: InvoiceSummary;
  purchaseWindowStatus: PurchaseWindowStatus;
  eligibilityStatus: EligibilityStatus;
  eligibilityMessage: string;
  recommendedPlanId: string | null;
  selectedProduct?: string;
};

const invoiceSummarySchema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    seller: { type: SchemaType.STRING, nullable: true },
    invoiceDateText: { type: SchemaType.STRING, nullable: true },
    invoiceDateNormalized: { type: SchemaType.STRING, nullable: true },
    invoiceNumber: { type: SchemaType.STRING, nullable: true },
    product: { type: SchemaType.STRING, nullable: true },
    brand: { type: SchemaType.STRING, nullable: true },
    model: { type: SchemaType.STRING, nullable: true },
    serialNumber: { type: SchemaType.STRING, nullable: true },
    invoiceValue: { type: SchemaType.STRING, nullable: true },
    currency: { type: SchemaType.STRING, nullable: true },
    purchaseLocationCountry: { type: SchemaType.STRING, nullable: true },
    matchedProductCategory: { type: SchemaType.STRING, nullable: true },
    missingDetails: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    notes: { type: SchemaType.STRING, nullable: true },
  },
  required: [
    "seller",
    "invoiceDateText",
    "invoiceDateNormalized",
    "invoiceNumber",
    "product",
    "brand",
    "model",
    "serialNumber",
    "invoiceValue",
    "currency",
    "purchaseLocationCountry",
    "matchedProductCategory",
    "missingDetails",
    "notes",
  ],
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function buildVerifiedDataBlock() {
  const productKnowledge = JSON.stringify(warrantyProducts, null, 2);
  const warrantyKnowledge = JSON.stringify(warrantyTerms, null, 2);

  return `VERIFIED WARRANTYS.CO PRODUCT DATA:

${productKnowledge}

Use this product data when answering questions about products, prices,
tenure, coverage, exclusions, eligibility and service.

Important:
- Treat this product data as the current source of truth for the products provided.
- Never invent a price or product that is not present in the data.
- Never recommend a product where active is false.
- If the customer asks about something not covered by the available data, say that the information is not currently available and recommend human support.

VERIFIED WARRANTYS.CO WARRANTY TERMS:

${warrantyKnowledge}

Use these warranty terms as the verified source of truth for warranty
coverage, exclusions, service, certificate requirements and repair limits.

Important:
- Never override the warranty terms with assumptions.
- Never invent coverage.
- Never approve or reject a claim.
- Physical damage is not covered.
- Liquid damage is not covered.
- AC gas is not covered.
- Repairs are arranged through authorized service centres or authorized brand service channels.
- Repair liability is limited to the product invoice value, subject to the applicable warranty terms.
- Warrantys.co aims to resolve eligible service requests within approximately 24 to 72 business hours, subject to service-centre and parts availability.
- The warranty certificate is provided within 24 hours after receiving and verifying the required details.
- Required details include the product invoice, product serial number and product images.
- If the customer's question cannot be answered confidently from the verified data, clearly state that the information is unavailable and recommend human support.`;
}

function buildBaseSystemInstruction() {
  return `You are Warrio AI - Your Warranty Warrior.

You are the AI assistant for Warrantys.co, built by AA Labs.

Your responsibilities:
- Help customers understand warranty options.
- Help customers understand warranty and protection plans.
- Help customers with warranty-related questions.
- Help customers understand the next steps for claims and service.
- Be friendly, clear and professional.

Critical rules:
- Never invent warranty coverage.
- Never invent prices.
- Never approve or reject a claim.
- Never pretend to know customer information that has not been provided.
- If information is unavailable or uncertain, clearly say so and recommend human support.

${buildVerifiedDataBlock()}`;
}

function buildInvoiceExtractionPrompt(input: {
  message: string;
  selectedProduct?: string;
}) {
  return `Extract the invoice into structured JSON.

Rules:
- Use only what is clearly visible or reliably readable from the invoice.
- Do not guess missing values.
- If a field is not visible or cannot be read confidently, use null.
- Do not decide claim approval or final eligibility.
- Keep the product identification conservative.
- If a selected product hint exists, treat it only as a hint.
- Do not include extra keys.

User message:
${input.message}

Selected product hint:
${input.selectedProduct || "none"}

Return only JSON matching the schema.`;
}

function buildInvoiceAnswerPrompt(input: {
  message: string;
  selectedProduct?: string;
  summary: InvoiceSummary;
  purchaseWindowStatus: PurchaseWindowStatus;
  eligibilityStatus: EligibilityStatus;
  eligibilityMessage: string;
  recommendedPlanId: string | null;
}) {
  return `Use the verified warranty data and the extracted invoice summary to answer the user.

Strict response rules:
- Be conservative with invoice interpretation.
- Distinguish clearly between information read from the invoice, information confirmed by verified warranty data, and information that is still missing.
- If the invoice suggests a product and purchase amount/date, you may say it appears to be that product and appears to be within the purchase window, but do not say the customer is definitely eligible unless every required eligibility detail is established.
- Never guarantee eligibility.
- Never approve or reject claims.
- Never invent missing invoice information.
- If information is unreliable, say it could not be confirmed.
- Keep the response friendly and consultative, like helpful advice rather than aggressive selling.
- Use the verified product data and warranty terms as the source of truth for plan options, exclusions and required details.
- The application has already determined eligibility and the recommended plan below. Do not change that decision or any price.
- If eligibility is not eligible, do not recommend a plan or payment.

User message:
${input.message}

Selected product hint:
${input.selectedProduct || "none"}

Extracted invoice summary:
${JSON.stringify(input.summary, null, 2)}

Server-side purchase window assessment:
${input.purchaseWindowStatus}

Server-side eligibility status:
${input.eligibilityStatus}

Server-side eligibility message:
${input.eligibilityMessage}

Server-side recommended plan ID:
${input.recommendedPlanId || "none"}

Response format:
- Invoice read:
- Verified Warrio data:
- Still missing / cannot confirm:
- Recommendation:

If the invoice data is incomplete, ask for the missing required details instead of guessing.`;
}

function createModel() {
  if (!genAI) {
    return null;
  }

  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: buildBaseSystemInstruction(),
  });
}

function parseInvoiceSummary(rawText: string): InvoiceSummary {
  const parsed = JSON.parse(rawText) as Partial<InvoiceSummary>;

  return {
    seller: parsed.seller ?? null,
    invoiceDateText: parsed.invoiceDateText ?? null,
    invoiceDateNormalized: parsed.invoiceDateNormalized ?? null,
    invoiceNumber: parsed.invoiceNumber ?? null,
    product: parsed.product ?? null,
    brand: parsed.brand ?? null,
    model: parsed.model ?? null,
    serialNumber: parsed.serialNumber ?? null,
    invoiceValue: parsed.invoiceValue ?? null,
    currency: parsed.currency ?? null,
    purchaseLocationCountry: parsed.purchaseLocationCountry ?? null,
    matchedProductCategory: parsed.matchedProductCategory ?? null,
    missingDetails: Array.isArray(parsed.missingDetails)
      ? parsed.missingDetails.filter(
          (entry): entry is string => typeof entry === "string"
        )
      : [],
    notes: parsed.notes ?? null,
  };
}

function normalizeInvoiceSummary(summary: InvoiceSummary): InvoiceSummary {
  return {
    ...summary,
    missingDetails: [...summary.missingDetails],
  };
}

function determineInvoiceAnalysis(summary: InvoiceSummary): InvoiceAnalysis {
  const normalizedCategory = summary.matchedProductCategory?.toLowerCase() || "";
  const isTelevision = normalizedCategory === "television";
  const purchaseWindowStatus = computePurchaseWindowStatus(
    summary.invoiceDateNormalized
  );

  let eligibilityStatus: EligibilityStatus = "eligible";
  let eligibilityMessage =
    "The invoice appears to be within the verified Television eligibility window.";

  if (!isTelevision || !summary.matchedProductCategory) {
    eligibilityStatus = "cannot_confirm";
    eligibilityMessage =
      "Warrio could not confidently match this invoice to the verified Television product data.";
  } else if (purchaseWindowStatus === "appears_outside_window") {
    eligibilityStatus = "ineligible";
    eligibilityMessage =
      "This Television invoice appears to be outside the verified 9-month eligibility window.";
  } else if (purchaseWindowStatus === "cannot_confirm") {
    eligibilityStatus = "cannot_confirm";
    eligibilityMessage =
      "Warrio needs a readable purchase date to confirm Television eligibility.";
  } else if (
    summary.purchaseLocationCountry &&
    summary.purchaseLocationCountry.toLowerCase() !== "india"
  ) {
    eligibilityStatus = "ineligible";
    eligibilityMessage =
      "The invoice purchase country does not match the verified Television eligibility rule for India.";
  }

  return {
    summary,
    purchaseWindowStatus,
    eligibilityStatus,
    eligibilityMessage,
    recommendedPlanId:
      eligibilityStatus === "eligible"
        ? televisionProduct.plans.find((plan) => plan.id === "tv-3-year")?.id || null
        : null,
    availablePlanIds: televisionProduct.plans.map((plan) => plan.id),
  };
}

function computePurchaseWindowStatus(
  invoiceDateNormalized: string | null
): PurchaseWindowStatus {
  if (!invoiceDateNormalized) {
    return "cannot_confirm";
  }

  const invoiceDate = new Date(invoiceDateNormalized);
  if (Number.isNaN(invoiceDate.getTime())) {
    return "cannot_confirm";
  }

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setMonth(windowStart.getMonth() - 9);

  return invoiceDate >= windowStart && invoiceDate <= now
    ? "appears_within_window"
    : "appears_outside_window";
}

function getInvoicePart(invoice: InvoiceUpload): Part {
  return {
    inlineData: {
      mimeType: invoice.mimeType,
      data: invoice.buffer.toString("base64"),
    },
  };
}

async function uploadPdfForAnalysis(invoice: InvoiceUpload) {
  if (!fileManager) {
    throw new Error("Warrio AI is being connected. The AI provider is not configured yet.");
  }

  const uploaded = await fileManager.uploadFile(invoice.buffer, {
    mimeType: invoice.mimeType,
    displayName: invoice.fileName,
  });

  const deadline = Date.now() + FILE_POLL_TIMEOUT_MS;
  let latestFile = uploaded.file;

  while (
    latestFile.state === FileState.PROCESSING &&
    Date.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, FILE_POLL_INTERVAL_MS));
    latestFile = await fileManager.getFile(latestFile.name);
  }

  if (latestFile.state !== FileState.ACTIVE) {
    throw new Error("Uploaded invoice file is not ready for analysis yet.");
  }

  return {
    fileData: {
      mimeType: latestFile.mimeType,
      fileUri: latestFile.uri,
    },
    cleanup: async () => {
      try {
        await fileManager.deleteFile(latestFile.name);
      } catch {
        // Best-effort cleanup only.
      }
    },
  };
}

async function generateWarrioResponse(input: {
  message: string;
  invoiceContext?: InvoiceAnalysisContext;
}) {
  const model = createModel();

  if (!model) {
    return {
      success: false,
      message:
        "Warrio AI is being connected. The AI provider is not configured yet.",
    };
  }

  try {
    const prompt = input.invoiceContext
      ? buildInvoiceAnswerPrompt({
          message: input.message,
          selectedProduct: input.invoiceContext.selectedProduct,
          summary: input.invoiceContext.summary,
          purchaseWindowStatus: input.invoiceContext.purchaseWindowStatus,
          eligibilityStatus: input.invoiceContext.eligibilityStatus,
          eligibilityMessage: input.invoiceContext.eligibilityMessage,
          recommendedPlanId: input.invoiceContext.recommendedPlanId,
        })
      : input.message;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: input.invoiceContext ? 0.2 : 0.4,
      },
    });

    return {
      success: true,
      message: result.response.text(),
    };
  } catch (error) {
    console.error("Gemini Warrio error:", getErrorMessage(error));

    return {
      success: false,
      message: "Warrio is temporarily unavailable. Please try again.",
    };
  }
}

export async function askWarrio(message: string) {
  return generateWarrioResponse({ message });
}

export async function analyzeInvoiceAndAnswer(input: {
  message: string;
  selectedProduct?: string;
  invoice: InvoiceUpload;
}) {
  if (!genAI) {
    return {
      success: false,
      message:
        "Warrio AI is being connected. The AI provider is not configured yet.",
    };
  }

  const model = createModel();

  if (!model) {
    return {
      success: false,
      message:
        "Warrio AI is being connected. The AI provider is not configured yet.",
    };
  }

  let cleanup: undefined | (() => Promise<void>);

  try {
    const pdfUpload =
      input.invoice.mimeType === "application/pdf"
        ? await uploadPdfForAnalysis(input.invoice)
        : null;

    cleanup = pdfUpload?.cleanup;

    const invoiceParts: Part[] = [{ text: buildInvoiceExtractionPrompt(input) }];

    if (pdfUpload) {
      invoiceParts.push({ fileData: pdfUpload.fileData });
    } else {
      invoiceParts.push(getInvoicePart(input.invoice));
    }

    const extractedResponse = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: invoiceParts,
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: invoiceSummarySchema,
        maxOutputTokens: 1024,
      },
    });

    const summary = normalizeInvoiceSummary(
      parseInvoiceSummary(extractedResponse.response.text())
    );
    const purchaseWindowStatus = computePurchaseWindowStatus(
      summary.invoiceDateNormalized
    );
    const analysis = determineInvoiceAnalysis(summary);

    const finalResponse = await generateWarrioResponse({
      message: input.message,
      invoiceContext: {
        summary,
        purchaseWindowStatus,
        eligibilityStatus: analysis.eligibilityStatus,
        eligibilityMessage: analysis.eligibilityMessage,
        recommendedPlanId: analysis.recommendedPlanId,
        selectedProduct: input.selectedProduct,
      },
    });

    return { ...finalResponse, analysis };
  } catch (error) {
    console.error("Gemini invoice analysis error:", getErrorMessage(error));

    return {
      success: false,
      message: "Warrio is temporarily unavailable. Please try again.",
    };
  } finally {
    if (cleanup) {
      await cleanup();
    }
  }
}
