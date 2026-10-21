import { NextResponse } from "next/server";

import { handleCustomerRequest } from "@/app/lib/agents/ceo";
import {
  isSupportedInvoiceFile,
  MAX_INVOICE_UPLOAD_BYTES,
  toInvoiceUpload,
} from "@/app/lib/invoiceFile";

function getTextField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const message = getTextField(formData, "message");
      const invoiceEntry = formData.get("invoice");
      const invoice =
        invoiceEntry instanceof File && invoiceEntry.size > 0 ? invoiceEntry : null;

      if (invoice && invoice.size > MAX_INVOICE_UPLOAD_BYTES) {
        return NextResponse.json(
          { success: false, message: "Please upload an invoice smaller than 10 MB." },
          { status: 413 }
        );
      }

      if (invoice && !isSupportedInvoiceFile(invoice)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Unsupported invoice file type. Please upload a PDF or common image format.",
          },
          { status: 415 }
        );
      }

      if (!invoice && !message) {
        return NextResponse.json(
          { success: false, message: "Please provide a message." },
          { status: 400 }
        );
      }

      const result = await handleCustomerRequest({
        channel: "website",
        message,
        customerName: getTextField(formData, "customerName") || undefined,
        selectedProduct: getTextField(formData, "selectedProduct") || undefined,
        invoice: invoice ? await toInvoiceUpload(invoice) : undefined,
      });

      return NextResponse.json(result);
    }

    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { success: false, message: "Please provide a message." },
        { status: 400 }
      );
    }

    const result = await handleCustomerRequest({
      channel: "website",
      message,
      selectedProduct:
        typeof body?.selectedProduct === "string" ? body.selectedProduct : undefined,
    });

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
