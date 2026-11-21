import { NextResponse } from "next/server";

import { isSupportedInvoiceFile, MAX_INVOICE_UPLOAD_BYTES, toInvoiceUpload } from "@/app/lib/invoiceFile";
import { extractAmazonInvoice } from "@/app/lib/warranty/extractAmazonInvoice";

export const dynamic = "force-dynamic";

// Reads one uploaded invoice so the form can fill itself in. Best-effort:
// errors never block the customer, they just mean more to type by hand.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const kind = form?.get("kind");
  const fileEntry = form?.get("invoice");

  if ((kind !== "product" && kind !== "warranty") || !(fileEntry instanceof File) || fileEntry.size === 0) {
    return NextResponse.json({ success: false, message: "No file received." }, { status: 400 });
  }
  if (fileEntry.size > MAX_INVOICE_UPLOAD_BYTES) {
    return NextResponse.json({ success: false, message: "File too large." }, { status: 413 });
  }
  if (!isSupportedInvoiceFile(fileEntry)) {
    return NextResponse.json({ success: false, message: "Unsupported file type." }, { status: 415 });
  }

  const result = await extractAmazonInvoice(await toInvoiceUpload(fileEntry), kind);
  if ("error" in result) {
    return NextResponse.json({ success: false, message: result.error });
  }
  return NextResponse.json({ success: true, ...result });
}
