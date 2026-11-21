import "server-only";

import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { leadsFile, type StoredLead } from "@/app/lib/integrations/leadStore";
import { findStuckCustomers } from "@/app/lib/monitoring/stuck";
import { brandedHtml, leadUpdatesAddress, sendMail } from "@/app/lib/warranty/email";

// Friendly reminder emails, sent from warrantys.co.amz@gmail.com, to customers
// who picked a plan and got a payment link but did not pay. Email only for now
// (Amit, 2026-11-01). One reminder about 2 hours after, a second after 24
// hours, then we stop. A copy of each goes to the same mailbox for the record,
// and every send is logged in followups.jsonl so nobody gets the same one twice.

type FollowupRecord = { date: string; lead_reference: string; step: 1 | 2; email: string; manual?: boolean };

const HOUR = 60 * 60 * 1000;
const FIRST_AFTER = 2 * HOUR;
const SECOND_AFTER = 24 * HOUR;
const GIVE_UP_AFTER = 4 * 24 * HOUR;

function followupFile() {
  return path.join(/*turbopackIgnore: true*/ path.dirname(leadsFile()), "followups.jsonl");
}

export async function readFollowups(): Promise<FollowupRecord[]> {
  try {
    const text = await readFile(/*turbopackIgnore: true*/ followupFile(), "utf8");
    return text.split("\n").filter(Boolean).flatMap((line) => {
      try {
        return [JSON.parse(line) as FollowupRecord];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function emailFor(lead: StoredLead, step: 1 | 2) {
  const device = [lead.brand, lead.model].filter(Boolean).join(" ") || lead.product_category;
  const link = lead.payment_link;
  const text =
    step === 1
      ? [
          `Hi ${firstName(lead.name)},`,
          ``,
          `Thank you for checking out Warrantys.co. You picked the ${lead.recommended_plan} for your ${device} (Rs ${lead.plan_price_inr}), and we have kept it ready for you.`,
          ``,
          `When you are ready, you can complete it here:`,
          link,
          ``,
          `If you have any question, or the page did not work for you, just reply to this email and we will help.`,
          ``,
          `Warrantys.co team`,
        ]
      : [
          `Hi ${firstName(lead.name)},`,
          ``,
          `A small reminder: your ${lead.recommended_plan} for your ${device} is still waiting for you (Rs ${lead.plan_price_inr}).`,
          ``,
          link,
          ``,
          `Is there anything we can answer first? Just reply to this email. If you have already decided against it, no problem at all, and we will not email you again.`,
          ``,
          `Warrantys.co team`,
        ];
  return {
    subject:
      step === 1
        ? `Your Warrantys.co plan for your ${device} is ready`
        : `Still thinking about your ${device} plan?`,
    text: text.join("\n"),
  };
}

async function sendStep(lead: StoredLead, step: 1 | 2, manual = false): Promise<boolean> {
  const { subject, text } = emailFor(lead, step);
  // The signature line moves into the branded version, which adds the logo.
  const html = brandedHtml(text.replace(/\n*Warrantys\.co team$/, "").split("\n"));
  const sent = await sendMail({
    to: lead.email,
    bcc: leadUpdatesAddress(),
    replyTo: leadUpdatesAddress(),
    subject,
    text,
    html,
  });
  if (sent) {
    await mkdir(/*turbopackIgnore: true*/ path.dirname(followupFile()), { recursive: true });
    const record: FollowupRecord = {
      date: new Date().toISOString(),
      lead_reference: lead.lead_reference,
      step,
      email: lead.email,
      ...(manual ? { manual: true } : {}),
    };
    await appendFile(/*turbopackIgnore: true*/ followupFile(), `${JSON.stringify(record)}\n`, "utf8");
  }
  return sent;
}

// Called every 30 minutes by the server (see instrumentation.ts).
export async function sendDueFollowups(now = Date.now()) {
  if (process.env.FOLLOWUP_EMAILS === "off") return;
  const [stuck, done] = await Promise.all([findStuckCustomers(now), readFollowups()]);
  for (const row of stuck) {
    const { lead } = row;
    if (row.reason !== "not_paid" || !lead.email || !lead.payment_link) continue;
    const age = now - new Date(lead.date).getTime();
    if (age > GIVE_UP_AFTER) continue;
    const steps = done.filter((record) => record.lead_reference === lead.lead_reference);
    const lastStep = steps.reduce((max, record) => Math.max(max, record.step), 0);
    if (lastStep === 0 && age >= FIRST_AFTER) await sendStep(lead, 1);
    else if (lastStep === 1 && age >= SECOND_AFTER) await sendStep(lead, 2);
  }
}

// The "Email reminder" button on the admin page.
export async function sendManualFollowup(lead: StoredLead): Promise<boolean> {
  if (!lead.email || !lead.payment_link) return false;
  const steps = (await readFollowups()).filter((record) => record.lead_reference === lead.lead_reference);
  return sendStep(lead, steps.length > 0 ? 2 : 1, true);
}
