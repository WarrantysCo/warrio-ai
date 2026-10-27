import "server-only";

import type { LeadRow } from "@/app/lib/integrations/n8n";

// Puts each website lead into HubSpot (free CRM): the customer as a contact
// (matched by email, or by mobile when there is no email, so a returning
// customer is updated, not duplicated) and the plan as a deal linked to that
// contact. Needs HUBSPOT_ACCESS_TOKEN from a HubSpot private app with the
// crm.objects.contacts.read/write and crm.objects.deals.write scopes; leave it
// empty to skip.

export type HubSpotDelivery = "sent" | "skipped" | "failed";

const API = "https://api.hubapi.com";

// HubSpot's built-in id for "deal belongs to contact".
const DEAL_TO_CONTACT = 3;

async function hubspot(path: string, token: string, body: unknown) {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} ${response.status} ${result?.message ?? ""}`.trim());
  }
  return result;
}

function splitName(fullName: string) {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  return { firstname: first ?? "", lastname: rest.join(" ") };
}

function deviceName(lead: LeadRow) {
  return [lead.brand, lead.model].filter(Boolean).join(" ") || lead.product_category;
}

function dealDescription(lead: LeadRow & { payment_link: string }) {
  return [
    `Lead reference: ${lead.lead_reference}`,
    `Status: ${lead.status}`,
    lead.status === "bill_pending"
      ? "Paid before sending the bill: collect the invoice, brand, model and serial."
      : "",
    `Device: ${lead.product_category} - ${[lead.brand, lead.model].filter(Boolean).join(" ") || "brand/model not given yet"}`,
    `Serial/IMEI: ${lead.serial_or_imei || "not given yet"}`,
    `Device price: Rs ${lead.price_inr}`,
    `Days since purchase: ${lead.days_since_purchase ?? "unknown"}`,
    `Invoice: ${lead.invoice_ok ? "read OK" : "not checked"}${lead.invoice_number ? ` (${lead.invoice_number}, ${lead.seller ?? ""})` : ""}`,
    `Payment link: ${lead.payment_link || "none (WhatsApp fallback)"}`,
    lead.question ? `Customer question: ${lead.question}` : "",
    lead.notes_for_team ? `Notes for team: ${lead.notes_for_team}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// Returns the HubSpot id of the customer's contact, creating or updating it.
async function saveContact(lead: LeadRow, token: string): Promise<string> {
  const email = lead.email.trim().toLowerCase();
  const phone = `+91${lead.mobile}`;
  const properties = { ...splitName(lead.name), phone, ...(email ? { email } : {}) };

  if (email) {
    const result = await hubspot("/crm/v3/objects/contacts/batch/upsert", token, {
      inputs: [{ idProperty: "email", id: email, properties }],
    });
    const id = result?.results?.[0]?.id;
    if (!id) throw new Error("contact upsert returned no id");
    return id;
  }

  // No email (e.g. "pay now, send bill later"): reuse the contact with this
  // mobile if there is one, otherwise create it.
  const found = await hubspot("/crm/v3/objects/contacts/search", token, {
    filterGroups: [{ filters: [{ propertyName: "phone", operator: "EQ", value: phone }] }],
    properties: ["phone"],
    limit: 1,
  });
  const existing = found?.results?.[0]?.id;
  if (existing) return existing;

  const created = await hubspot("/crm/v3/objects/contacts", token, { properties });
  if (!created?.id) throw new Error("contact create returned no id");
  return created.id;
}

export async function sendLeadToHubSpot(
  lead: LeadRow & { payment_link: string }
): Promise<HubSpotDelivery> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return "skipped";

  try {
    const contactId = await saveContact(lead, token);

    await hubspot("/crm/v3/objects/deals", token, {
      properties: {
        dealname: `${lead.recommended_plan} - ${deviceName(lead)} (${lead.lead_reference})`,
        amount: String(lead.plan_price_inr),
        pipeline: "default",
        dealstage: "appointmentscheduled",
        description: dealDescription(lead),
      },
      associations: [
        {
          to: { id: contactId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: DEAL_TO_CONTACT,
            },
          ],
        },
      ],
    });
    return "sent";
  } catch (error) {
    console.error(
      "HubSpot lead error:",
      error instanceof Error ? error.message : error
    );
    return "failed";
  }
}

// Logs the certificate email on the customer's HubSpot contact timeline, so
// every communication is visible in one place.
export async function logCertificateEmailToHubSpot(options: {
  email: string;
  mobile: string;
  subject: string;
  body: string;
  sentAt: number;
}): Promise<HubSpotDelivery> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return "skipped";

  try {
    const email = options.email.trim().toLowerCase();
    const phone = `+91${options.mobile}`;
    const found = await hubspot("/crm/v3/objects/contacts/search", token, {
      filterGroups: [
        email
          ? { filters: [{ propertyName: "email", operator: "EQ", value: email }] }
          : { filters: [{ propertyName: "phone", operator: "EQ", value: phone }] },
      ],
      properties: ["email"],
      limit: 1,
    });
    const contactId = found?.results?.[0]?.id;
    if (!contactId) return "skipped";

    await hubspot("/crm/v3/objects/emails", token, {
      properties: {
        hs_timestamp: String(options.sentAt),
        hs_email_direction: "EMAIL",
        hs_email_status: "SENT",
        hs_email_subject: options.subject,
        hs_email_text: options.body,
      },
      associations: [
        {
          to: { id: contactId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 198 }],
        },
      ],
    });
    return "sent";
  } catch (error) {
    console.error(
      "HubSpot certificate email log error:",
      error instanceof Error ? error.message : error
    );
    return "failed";
  }
}
