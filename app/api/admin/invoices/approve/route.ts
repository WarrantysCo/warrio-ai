import { NextResponse } from "next/server";

import { adminAuthRequired, isAdminAllowed } from "@/app/lib/adminAuth";
import { readInvoices, saveInvoiceEvent } from "@/app/lib/invoices/store";
import { siteUrl } from "@/app/lib/warranty/link";

export const dynamic = "force-dynamic";

// Amit's own click on "Approve & send" is the approval: only then does the
// invoice server sign with his signature and email the customer.
export async function POST(request: Request) {
  if (!isAdminAllowed(request)) return adminAuthRequired();

  const back = new URL("/admin/invoices", siteUrl());
  const fail = (message: string) => {
    back.searchParams.set("error", message);
    return NextResponse.redirect(back, 303);
  };

  const url = process.env.INVOICE_API_URL;
  if (!url) return fail("Not connected to the invoice server yet.");

  const form = await request.formData();
  const ref = String(form.get("leadReference") ?? "").trim();
  const invoice = (await readInvoices()).get(ref);
  if (!invoice) return fail("No invoice has been created for that order yet.");
  if (invoice.approved) return fail(`${invoice.invoice_no} was already approved and sent.`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Warrio-Key": process.env.INVOICE_API_KEY ?? "" },
      body: JSON.stringify({ action: "approve", invoice_no: invoice.invoice_no, send: true }),
      signal: AbortSignal.timeout(60_000),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; sent?: boolean };
    if (!response.ok || !data.ok) return fail(data.error || "The invoice server refused.");
    await saveInvoiceEvent({ date: new Date().toISOString(), lead_reference: ref, invoice_no: invoice.invoice_no, step: "approved_sent" });
    back.searchParams.set("done", `${invoice.invoice_no} signed${data.sent ? " and emailed to the customer" : ""}.`);
    return NextResponse.redirect(back, 303);
  } catch {
    return fail("The invoice server did not answer. Try again in a minute.");
  }
}
