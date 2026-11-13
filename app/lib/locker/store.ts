import "server-only";

import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { salesRules } from "@/app/data/salesRules";
import { quotePlans } from "@/app/lib/agents/sales/pricing";
import { leadsFile } from "@/app/lib/integrations/leadStore";
import { brandedHtml, leadUpdatesAddress, sendMail } from "@/app/lib/warranty/email";
import { siteUrl } from "@/app/lib/warranty/link";

import { addDays, daysUntil, formatDate } from "./dates";

// The Free Bill Locker: a customer uploads any bill, we keep it and remind
// them before the brand warranty ends. One JSON line per saved bill, next to
// leads.jsonl. Kept apart from leads.jsonl on purpose: a locker entry is not
// an order, so it must not show up as an "unpaid customer".

export type LockerRecord = {
  date: string;
  locker_reference: string;
  name: string;
  mobile: string;
  email: string;
  device_name: string;
  brand: string;
  model: string;
  category_id: string;
  price_inr: number | null;
  purchase_date: string; // YYYY-MM-DD
  warranty_months: number;
  warranty_end_date: string; // YYYY-MM-DD
  invoice_file: string;
};

type ReminderStep = "window" | "end30" | "end7";
type ReminderRecord = { date: string; locker_reference: string; step: ReminderStep; email: string };

function dataDir() {
  return path.dirname(/*turbopackIgnore: true*/ leadsFile());
}
const lockerFile = () => path.join(/*turbopackIgnore: true*/ dataDir(), "bill-locker.jsonl");
const remindersFile = () => path.join(/*turbopackIgnore: true*/ dataDir(), "bill-locker-reminders.jsonl");

async function readLines<T>(file: string): Promise<T[]> {
  try {
    const text = await readFile(/*turbopackIgnore: true*/ file, "utf8");
    return text.split("\n").filter(Boolean).flatMap((line) => {
      try {
        return [JSON.parse(line) as T];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

async function appendLine(file: string, record: unknown) {
  await mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  await appendFile(/*turbopackIgnore: true*/ file, `${JSON.stringify(record)}\n`, "utf8");
}

export async function saveLockerRecord(record: LockerRecord): Promise<boolean> {
  try {
    await appendLine(lockerFile(), record);
    return true;
  } catch (error) {
    console.error("Saving bill locker entry failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

export const readLockerRecords = () => readLines<LockerRecord>(lockerFile());

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

// When each reminder falls due. "window" is the last month in which an
// extended warranty can still be added, and is only for devices we sell a
// plan for.
function dueDate(record: LockerRecord, step: ReminderStep): string | null {
  if (step === "end30") return addDays(record.warranty_end_date, -30);
  if (step === "end7") return addDays(record.warranty_end_date, -7);
  if (record.price_inr === null || quotePlans(record.category_id, record.price_inr).length === 0) return null;
  return addDays(record.purchase_date, salesRules.purchaseWindowDays - 30);
}

function reminderEmail(record: LockerRecord, step: ReminderStep) {
  const device = record.device_name || [record.brand, record.model].filter(Boolean).join(" ") || "device";
  const checkLink = `${siteUrl()}/warranty-check`;
  const stop = `You asked for these reminders when you saved your bill on warrantys.co. To stop them, just reply STOP.`;
  if (step === "window") {
    const lastDay = addDays(record.purchase_date, salesRules.purchaseWindowDays);
    const lowest = Math.min(
      ...quotePlans(record.category_id, record.price_inr ?? 0).map((plan) => plan.price_inr)
    );
    return {
      subject: `Last month to add extended warranty to your ${device}`,
      lines: [
        `Hi ${firstName(record.name)},`,
        ``,
        `Your bill for your ${device} is safe in your Warrantys.co Bill Locker.`,
        ``,
        `A quick reminder: an extended warranty can only be added in the first 9 months after buying. For your ${device} the last day is ${formatDate(lastDay)}. Plans start from Rs ${lowest.toLocaleString("en-IN")}.`,
        ``,
        `See your price here:`,
        checkLink,
        ``,
        stop,
      ],
    };
  }
  const days = Math.max(daysUntil(record.warranty_end_date), 0);
  return {
    subject: `Your ${device} brand warranty ends in ${days} days`,
    lines: [
      `Hi ${firstName(record.name)},`,
      ``,
      `The brand warranty on your ${device} ends on ${formatDate(record.warranty_end_date)}, ${days} days from now.`,
      ``,
      `If anything is not working properly, get it repaired free by the brand before that date. Your bill is safe in your Warrantys.co Bill Locker. Reply to this email if you need a copy.`,
      ``,
      stop,
    ],
  };
}

// Called every 30 minutes by the server (see instrumentation.ts). A reminder
// is sent once, on or shortly after its due date, and never for a date that
// had already passed when the customer saved the bill.
export async function sendDueLockerReminders(now = new Date()) {
  if (process.env.LOCKER_REMINDERS === "off") return;
  const [records, sent] = await Promise.all([
    readLockerRecords(),
    readLines<ReminderRecord>(remindersFile()),
  ]);
  const today = now.toISOString().slice(0, 10);
  for (const record of records) {
    if (!record.email) continue;
    for (const step of ["window", "end30", "end7"] as const) {
      const due = dueDate(record, step);
      if (!due || due > today || due <= record.date.slice(0, 10)) continue;
      if (daysUntil(due, now) < -5) continue; // too late to be useful
      if (sent.some((row) => row.locker_reference === record.locker_reference && row.step === step)) continue;
      const { subject, lines } = reminderEmail(record, step);
      const ok = await sendMail({
        to: record.email,
        bcc: leadUpdatesAddress(),
        replyTo: leadUpdatesAddress(),
        subject,
        text: `${lines.join("\n")}\n\nWarrantys.co team`,
        html: brandedHtml(lines),
      });
      if (ok) {
        const row: ReminderRecord = {
          date: now.toISOString(),
          locker_reference: record.locker_reference,
          step,
          email: record.email,
        };
        await appendLine(remindersFile(), row);
        sent.push(row);
      }
    }
  }
}
