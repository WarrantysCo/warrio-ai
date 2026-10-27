import "server-only";

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { leadsFile } from "@/app/lib/integrations/leadStore";

// What happens to an order after the lead: the payment Razorpay confirmed and
// the details the customer sent for the certificate. Kept next to leads.jsonl,
// one JSON line per event, so leads.jsonl itself never has to be rewritten.

export type PaymentRecord = {
  type: "payment";
  date: string;
  lead_reference: string;
  payment_id: string;
  payment_link_id: string;
};

export type DetailsRecord = {
  type: "details";
  date: string;
  lead_reference: string;
  name: string;
  mobile: string;
  email: string;
  device_name: string;
  brand: string;
  model: string;
  serial_or_imei: string;
  device_purchase_date: string;
  invoice_file: string;
  notes_for_team: string;
};

export type WarrantyRecord = PaymentRecord | DetailsRecord;

export type WarrantyStatus = {
  payment?: PaymentRecord;
  details?: DetailsRecord;
};

function dataDir() {
  return path.dirname(/*turbopackIgnore: true*/ leadsFile());
}

function warrantyFile() {
  return path.join(/*turbopackIgnore: true*/ dataDir(), "warranty.jsonl");
}

export async function saveWarrantyRecord(record: WarrantyRecord): Promise<boolean> {
  try {
    await mkdir(/*turbopackIgnore: true*/ dataDir(), { recursive: true });
    await appendFile(/*turbopackIgnore: true*/ warrantyFile(), `${JSON.stringify(record)}\n`, "utf8");
    return true;
  } catch (error) {
    console.error(
      "Saving warranty record failed:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

// The latest payment and details for every lead reference.
export async function readWarrantyStatuses(): Promise<Map<string, WarrantyStatus>> {
  const statuses = new Map<string, WarrantyStatus>();
  let text: string;
  try {
    text = await readFile(/*turbopackIgnore: true*/ warrantyFile(), "utf8");
  } catch {
    return statuses;
  }
  for (const line of text.split("\n").filter(Boolean)) {
    let record: WarrantyRecord;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    const status = statuses.get(record.lead_reference) ?? {};
    if (record.type === "payment") status.payment = record;
    if (record.type === "details") status.details = record;
    statuses.set(record.lead_reference, status);
  }
  return statuses;
}

export async function readWarrantyStatus(leadReference: string) {
  return (await readWarrantyStatuses()).get(leadReference) ?? {};
}

// Invoices are saved as <lead reference>-<time>.<ext> in an invoices folder.
const INVOICE_NAME = /^[A-Z0-9-]+-\d+\.(pdf|jpg|jpeg|png|webp|gif|heic|heif)$/i;

function invoicesDir() {
  return path.join(/*turbopackIgnore: true*/ dataDir(), "invoices");
}

export async function saveInvoiceFile(
  leadReference: string,
  file: File
): Promise<string> {
  const extension =
    file.name.match(/\.(pdf|jpg|jpeg|png|webp|gif|heic|heif)$/i)?.[1]?.toLowerCase() ??
    (file.type === "application/pdf" ? "pdf" : file.type.split("/")[1] || "jpg");
  const name = `${leadReference}-${Date.now()}.${extension}`;
  await mkdir(/*turbopackIgnore: true*/ invoicesDir(), { recursive: true });
  await writeFile(
    /*turbopackIgnore: true*/ path.join(invoicesDir(), name),
    Buffer.from(await file.arrayBuffer())
  );
  return name;
}

export async function readInvoiceFile(name: string): Promise<Buffer | null> {
  if (!INVOICE_NAME.test(name)) return null;
  try {
    return await readFile(/*turbopackIgnore: true*/ path.join(invoicesDir(), name));
  } catch {
    return null;
  }
}
