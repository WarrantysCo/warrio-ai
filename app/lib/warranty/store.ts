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
  // Amazon claims only: the separate order/invoice for the warranty plan
  // itself, and a couple of photos of the device for our own records.
  warranty_invoice_file?: string;
  condition_photos?: string[];
  notes_for_team: string;
};

export type CertificateSentRecord = {
  type: "sent";
  date: string;
  lead_reference: string;
  email: string;
  plan_start_date: string;
  plan_end_date: string;
};

export type WarrantyRecord = PaymentRecord | DetailsRecord | CertificateSentRecord;

export type WarrantyStatus = {
  payment?: PaymentRecord;
  details?: DetailsRecord;
  sent?: CertificateSentRecord;
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
    if (record.type === "sent") status.sent = record;
    statuses.set(record.lead_reference, status);
  }
  return statuses;
}

export async function readWarrantyStatus(leadReference: string) {
  return (await readWarrantyStatuses()).get(leadReference) ?? {};
}

export type WarrantyQueueRow = {
  lead_reference: string;
} & WarrantyStatus;

// Every lead that sent its details, newest first, for the admin page.
export async function readWarrantyQueue(): Promise<WarrantyQueueRow[]> {
  const statuses = await readWarrantyStatuses();
  return [...statuses.entries()]
    .filter(([, status]) => status.details)
    .map(([lead_reference, status]) => ({ lead_reference, ...status }))
    .sort((a, b) => (b.details?.date ?? "").localeCompare(a.details?.date ?? ""));
}

// Invoices are saved as <lead reference>-<time>.<ext> in an invoices folder.
const INVOICE_NAME = /^[A-Z0-9-]+-\d+\.(pdf|jpg|jpeg|png|webp|gif|heic|heif)$/i;

function invoicesDir() {
  return path.join(/*turbopackIgnore: true*/ dataDir(), "invoices");
}

export async function saveInvoiceFile(
  leadReference: string,
  file: File,
  label?: string
): Promise<string> {
  const extension =
    file.name.match(/\.(pdf|jpg|jpeg|png|webp|gif|heic|heif)$/i)?.[1]?.toLowerCase() ??
    (file.type === "application/pdf" ? "pdf" : file.type.split("/")[1] || "jpg");
  const safeLabel = label?.replace(/[^a-zA-Z0-9]/g, "");
  const name = `${leadReference}-${safeLabel ? `${safeLabel}-` : ""}${Date.now()}.${extension}`;
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
