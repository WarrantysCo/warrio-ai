import { NextResponse } from "next/server";

import { isSupportedInvoiceFile, MAX_INVOICE_UPLOAD_BYTES, toInvoiceUpload } from "@/app/lib/invoiceFile";
import { allowRequest } from "@/app/lib/locker/rateLimit";
import { extractAmazonInvoice } from "@/app/lib/warranty/extractAmazonInvoice";

export const dynamic = "force-dynamic";

// Reads the uploaded bill for the Free Warranty Check. Best-effort: when the
// AI cannot read it, the visitor types the purchase date in themselves.
export async function POST(request: Request) {
  if (!allowRequest(request, 12)) {
    return NextResponse.json(
      { success: false, message: "Too many bills checked. Please try again in an hour." },
      { status: 429 }
    );
  }
  const form = await request.formData().catch(() => null);
  const fileEntry = form?.get("invoice");
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return NextResponse.json({ success: false, message: "No file received." }, { status: 400 });
  }
  if (fileEntry.size > MAX_INVOICE_UPLOAD_BYTES) {
    return NextResponse.json({ success: false, message: "Please upload a file smaller than 10 MB." }, { status: 413 });
  }
  if (!isSupportedInvoiceFile(fileEntry)) {
    return NextResponse.json({ success: false, message: "Please upload a photo or a PDF." }, { status: 415 });
  }

  const result = await extractAmazonInvoice(await toInvoiceUpload(fileEntry), "product");
  if ("error" in result) {
    return NextResponse.json({ success: false, message: result.error });
  }
  return NextResponse.json({ success: true, ...result });
}
