import { NextResponse } from "next/server";

import {
  analyzeInvoiceAndAnswer,
  askWarrio,
  MAX_INVOICE_UPLOAD_BYTES,
  SUPPORTED_INVOICE_MIME_TYPES,
} from "@/app/lib/ai/provider";

function getTextField(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function isSupportedInvoiceFile(file: File) {
  if (SUPPORTED_INVOICE_MIME_TYPES.has(file.type)) {
    return true;
  }

  const loweredName = file.name.toLowerCase();

  return (
    loweredName.endsWith(".pdf") ||
    loweredName.endsWith(".jpg") ||
    loweredName.endsWith(".jpeg") ||
    loweredName.endsWith(".png") ||
    loweredName.endsWith(".webp") ||
    loweredName.endsWith(".gif") ||
    loweredName.endsWith(".heic") ||
    loweredName.endsWith(".heif")
  );
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const message = getTextField(formData, "message");
      const selectedProduct = getTextField(formData, "selectedProduct");
      const invoiceEntry = formData.get("invoice");

      if (invoiceEntry instanceof File) {
        if (invoiceEntry.size > MAX_INVOICE_UPLOAD_BYTES) {
          return NextResponse.json(
            {
              success: false,
              message: "Please upload an invoice smaller than 10 MB.",
            },
            { status: 413 }
          );
        }

        if (!isSupportedInvoiceFile(invoiceEntry)) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Unsupported invoice file type. Please upload a PDF or common image format.",
            },
            { status: 415 }
          );
        }

        const buffer = Buffer.from(await invoiceEntry.arrayBuffer());
        const result = await analyzeInvoiceAndAnswer({
          message:
            message || "Please analyze this invoice and recommend the available warranty options.",
          selectedProduct: selectedProduct || undefined,
          invoice: {
            buffer,
            mimeType: invoiceEntry.type || (invoiceEntry.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream"),
            fileName: invoiceEntry.name,
          },
        });

        return NextResponse.json(result);
      }

      if (!message) {
        return NextResponse.json(
          {
            success: false,
            message: "Please provide a message.",
          },
          { status: 400 }
        );
      }

      const result = await askWarrio(message);
      return NextResponse.json(result);
    }

    const body = await request.json();
    const message = body?.message;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a message.",
        },
        { status: 400 }
      );
    }

    const result = await askWarrio(message);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Warrio API error:", error instanceof Error ? error.message : error);

    return NextResponse.json(
      {
        success: false,
        message: "Warrio is temporarily unavailable. Please try again.",
      },
      { status: 500 }
    );
  }
}
