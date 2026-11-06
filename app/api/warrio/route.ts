import { NextResponse } from "next/server";

import { reportProblem } from "@/app/lib/monitoring/problems";

import { handleCustomerRequest } from "@/app/lib/agents/ceo";
import { chatFileLabel, cleanChatId, saveChatLine } from "@/app/lib/chats/store";
import { saveInvoiceFile } from "@/app/lib/warranty/store";
import type { AgentResponse } from "@/app/lib/agents/types";
import {
  isSupportedInvoiceFile,
  MAX_INVOICE_UPLOAD_BYTES,
  toInvoiceUpload,
} from "@/app/lib/invoiceFile";

function getTextField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// Saves what the customer said and what Warrio answered, so Amit can read it
// later next to the lead. Never blocks or breaks the answer.
async function logChat(
  chatId: string,
  customerText: string,
  result: AgentResponse,
  invoice: File | null
) {
  if (!chatId) return;
  let text = customerText;
  if (invoice) {
    let saved = "";
    try {
      saved = await saveInvoiceFile(chatFileLabel(chatId), invoice);
    } catch {
      /* the chat line below still records the upload */
    }
    text += `${text ? " " : ""}[uploaded bill: ${invoice.name}${saved ? ` - saved as ${saved}` : ""}]`;
  }
  await saveChatLine({ chat_id: chatId, kind: "customer", text });
  await saveChatLine({ chat_id: chatId, kind: "warrio", text: result.message ?? "" });
  if (result.analysis) {
    const a = result.analysis;
    await saveChatLine({
      chat_id: chatId,
      kind: "event",
      text: `Warrio read the bill: ${a.invoice?.brand ?? ""} ${a.invoice?.model ?? ""} Rs ${a.invoice?.price_inr ?? "?"}, ${a.eligibility_status}. Plans shown: ${(a.plan_options ?? []).map((plan) => `${plan.plan_name} Rs ${plan.price_inr}`).join(", ") || "none"}`,
    });
  }
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

      const chatId = cleanChatId(getTextField(formData, "chatId"));
      const result = await handleCustomerRequest({
        channel: "website",
        message,
        customerName: getTextField(formData, "customerName") || undefined,
        selectedProduct: getTextField(formData, "selectedProduct") || undefined,
        invoice: invoice ? await toInvoiceUpload(invoice) : undefined,
      });

      await logChat(chatId, message, result, invoice);
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

    await logChat(cleanChatId(body?.chatId), message, result, null);
    return NextResponse.json(result);
  } catch (error) {
    await reportProblem({
      kind: "warrio_ai",
      where: "/api/warrio",
      message: `Warrio crashed: ${error instanceof Error ? error.message : String(error)}`,
    });

    return NextResponse.json(
      {
        success: false,
        message: "Warrio is temporarily unavailable. Please try again.",
      },
      { status: 500 }
    );
  }
}
