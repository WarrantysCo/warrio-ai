import "server-only";

import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { leadsFile } from "@/app/lib/integrations/leadStore";

// Which invoice number the invoice server gave each order, and what has
// happened to it. The register itself lives on the server; this is only so the
// admin page can show "created / approved and sent" next to each order.

export type InvoiceEvent = {
  date: string;
  lead_reference: string;
  invoice_no: string;
  step: "created" | "approved_sent";
};

function file() {
  return path.join(/*turbopackIgnore: true*/ path.dirname(/*turbopackIgnore: true*/ leadsFile()), "invoices.jsonl");
}

export async function saveInvoiceEvent(event: InvoiceEvent) {
  await mkdir(/*turbopackIgnore: true*/ path.dirname(/*turbopackIgnore: true*/ file()), { recursive: true });
  await appendFile(/*turbopackIgnore: true*/ file(), `${JSON.stringify(event)}\n`, "utf8");
}

export async function readInvoices(): Promise<Map<string, { invoice_no: string; approved: boolean }>> {
  const map = new Map<string, { invoice_no: string; approved: boolean }>();
  let text = "";
  try {
    text = await readFile(/*turbopackIgnore: true*/ file(), "utf8");
  } catch {
    return map;
  }
  for (const line of text.split("\n").filter(Boolean)) {
    try {
      const e = JSON.parse(line) as InvoiceEvent;
      const prev = map.get(e.lead_reference);
      map.set(e.lead_reference, {
        invoice_no: e.invoice_no,
        approved: e.step === "approved_sent" || Boolean(prev?.approved && prev.invoice_no === e.invoice_no),
      });
    } catch {
      continue;
    }
  }
  return map;
}
