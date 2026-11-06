import "server-only";

import { readLeads, type StoredLead } from "@/app/lib/integrations/leadStore";
import { warrantyLink } from "@/app/lib/warranty/link";
import { readWarrantyStatuses, type WarrantyStatus } from "@/app/lib/warranty/store";

// Customers who started but did not finish, worked out from the leads and
// warranty records we already keep. Nothing here is an error: it is a list of
// people the team should call before they give up on us.

export type StuckReason =
  | "not_paid"
  | "paid_no_details"
  | "amazon_no_details"
  | "awaiting_approval";

export type StuckCustomer = {
  reason: StuckReason;
  lead: StoredLead;
  status: WarrantyStatus;
  // When the customer got stuck (order made, paid, or details sent).
  since: string;
  hoursWaiting: number;
  // The customer's own "complete your warranty" link, to send them again.
  formLink?: string;
  note?: string;
};

export const STUCK_LABELS: Record<StuckReason, { title: string; help: string }> = {
  paid_no_details: {
    title: "Paid, but did not fill the details form",
    help: "Send them their form link on WhatsApp or call them.",
  },
  awaiting_approval: {
    title: "Sent details, waiting for your approval over 24 hours",
    help: "Open Certificates and approve.",
  },
  not_paid: {
    title: "Picked a plan, payment not confirmed",
    help: "They may have dropped off at payment, or paid and closed the page. Check Razorpay, then call them.",
  },
  amazon_no_details: {
    title: "Amazon order, customer has not sent details",
    help: "Remind them through Amazon's Contact Buyer message.",
  },
};

const HOUR = 60 * 60 * 1000;
// How long before each case counts as stuck, and how far back we look for
// unpaid orders (older ones are simply lost sales, not worth a daily nag).
const PAID_NO_DETAILS_AFTER = 2 * HOUR;
const APPROVAL_AFTER = 24 * HOUR;
const NOT_PAID_AFTER = 1 * HOUR;
const NOT_PAID_LOOKBACK = 7 * 24 * HOUR;
const AMAZON_AFTER = 48 * HOUR;

export async function findStuckCustomers(now = Date.now()): Promise<StuckCustomer[]> {
  const [leads, statuses] = await Promise.all([readLeads(), readWarrantyStatuses()]);
  // A lead can be saved more than once (Amazon resubmits); the last one wins.
  const latest = new Map(leads.map((lead) => [lead.lead_reference, lead]));
  const stuck: StuckCustomer[] = [];

  for (const lead of latest.values()) {
    const status = statuses.get(lead.lead_reference) ?? {};
    const hoursSince = (date: string) => Math.floor((now - new Date(date).getTime()) / HOUR);
    const add = (reason: StuckReason, since: string, extra: Partial<StuckCustomer> = {}) =>
      stuck.push({ reason, lead, status, since, hoursWaiting: hoursSince(since), ...extra });

    if (status.sent) continue;

    if (status.details) {
      if (now - new Date(status.details.date).getTime() >= APPROVAL_AFTER) {
        add("awaiting_approval", status.details.date);
      }
      continue;
    }

    if (lead.source === "amazon") {
      if (now - new Date(lead.date).getTime() >= AMAZON_AFTER) {
        add("amazon_no_details", lead.date);
      }
      continue;
    }

    if (status.payment) {
      if (now - new Date(status.payment.date).getTime() >= PAID_NO_DETAILS_AFTER) {
        const days = hoursSince(status.payment.date) / 24;
        add("paid_no_details", status.payment.date, {
          formLink: warrantyLink(lead.lead_reference),
          note:
            lead.status === "bill_pending" && days >= 7
              ? "Paid before sending the bill, 7 days are over: refund if they do not send it."
              : undefined,
        });
      }
      continue;
    }

    // Only orders that really got a payment link: without one the customer
    // was sent to WhatsApp, and that is already logged as a problem.
    const age = now - new Date(lead.date).getTime();
    if (lead.payment_link && age >= NOT_PAID_AFTER && age <= NOT_PAID_LOOKBACK) {
      add("not_paid", lead.date);
    }
  }

  const order: StuckReason[] = ["paid_no_details", "awaiting_approval", "not_paid", "amazon_no_details"];
  return stuck.sort(
    (a, b) => order.indexOf(a.reason) - order.indexOf(b.reason) || b.since.localeCompare(a.since)
  );
}
