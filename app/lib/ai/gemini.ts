import "server-only";

import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  type GenerateContentRequest,
} from "@google/generative-ai";
import {
  FileState,
  GoogleAIFileManager,
  type Part,
} from "@google/generative-ai/server";

import type { InvoiceUpload } from "../invoiceFile";

const apiKey = process.env.GEMINI_API_KEY;

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const fileManager = apiKey ? new GoogleAIFileManager(apiKey) : null;

// Tried in order. Google often answers 503 "high demand" for a few seconds,
// so a busy model hands the request to the next one instead of failing.
const MODEL_NAMES = ["gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-flash-latest"];
const RETRY_STATUSES = new Set([429, 500, 503]);
const FILE_POLL_INTERVAL_MS = 1_000;
const FILE_POLL_TIMEOUT_MS = 15_000;

export const AI_NOT_CONFIGURED_MESSAGE =
  "Warrio AI is being connected. The AI provider is not configured yet.";
export const AI_UNAVAILABLE_MESSAGE =
  "Warrio is temporarily unavailable. Please try again.";

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function createModel(systemInstruction?: string) {
  const client = genAI;
  if (!client) return null;

  return {
    async generateContent(request: GenerateContentRequest) {
      let lastError: unknown;
      for (const model of MODEL_NAMES) {
        try {
          return await client
            .getGenerativeModel({ model, systemInstruction })
            .generateContent(request);
        } catch (error) {
          lastError = error;
          const status =
            error instanceof GoogleGenerativeAIFetchError ? error.status : undefined;
          if (status === undefined || !RETRY_STATUSES.has(status)) throw error;
          console.error(`Gemini ${model} busy (${status}), trying the next model.`);
        }
      }
      throw lastError;
    },
  };
}

async function uploadPdfForAnalysis(invoice: InvoiceUpload) {
  if (!fileManager) {
    throw new Error(AI_NOT_CONFIGURED_MESSAGE);
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
    part: {
      fileData: {
        mimeType: latestFile.mimeType,
        fileUri: latestFile.uri,
      },
    } satisfies Part,
    cleanup: async () => {
      try {
        await fileManager.deleteFile(latestFile.name);
      } catch {
        // Best-effort cleanup only.
      }
    },
  };
}

// PDFs go through the Gemini file API; images are sent inline.
export async function prepareInvoicePart(
  invoice: InvoiceUpload
): Promise<{ part: Part; cleanup?: () => Promise<void> }> {
  if (invoice.mimeType === "application/pdf") {
    return uploadPdfForAnalysis(invoice);
  }

  return {
    part: {
      inlineData: {
        mimeType: invoice.mimeType,
        data: invoice.buffer.toString("base64"),
      },
    },
  };
}
