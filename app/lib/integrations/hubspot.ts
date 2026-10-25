import "server-only";

import type { LeadRow } from "@/app/lib/integrations/n8n";

// Puts each website lead into HubSpot (free CRM): the customer as a contact
// (matched by email, so a returning customer is updated, not duplicated) and
// the plan as a deal linked to that contact. Needs HUBSPOT_ACCESS_TOKEN from a
// HubSpot private app with the crm.objects.contacts.write and
// crm.objects.deals.write scopes; leave it empty to skip.

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

function dealDescription(lead: LeadRow & { payment_link: string }) {
  return [
    `Lead reference: ${lead.lead_reference}`,
    `Device: ${lead.product_category} - ${lead.brand} ${lead.model}`,
    `Serial/IMEI: ${lead.serial_or_imei}`,
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

export async function sendLeadToHubSpot(
  lead: LeadRow & { payment_link: string }
): Promise<HubSpotDelivery> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return "skipped";

  try {
    const contact = await hubspot(
      "/crm/v3/objects/contacts/batch/upsert",
      token,
      {
        inputs: [
          {
            idProperty: "email",
            id: lead.email.toLowerCase(),
            properties: {
              email: lead.email.toLowerCase(),
              ...splitName(lead.name),
              phone: `+91${lead.mobile}`,
            },
          },
        ],
      }
    );
    const contactId = contact?.results?.[0]?.id;
    if (!contactId) throw new Error("contact upsert returned no id");

    await hubspot("/crm/v3/objects/deals", token, {
      properties: {
        dealname: `${lead.recommended_plan} - ${lead.brand} ${lead.model} (${lead.lead_reference})`,
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
