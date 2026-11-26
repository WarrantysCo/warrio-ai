import "server-only";

// Sends website leads to the n8n workflow so they land in the same
// "Warrio Leads" table as leads from the n8n form. Set N8N_LEADS_WEBHOOK_URL to
// the production URL of an n8n Webhook node; leave it empty to skip.

// Column names match the n8n "Warrio Leads" Data Table.
export type LeadRow = {
  date: string;
  name: string;
  mobile: string;
  email: string;
  question: string;
  invoice_ok: boolean;
  invoice_file: string;
  seller: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  name_on_invoice: string | null;
  product_category: string;
  brand: string;
  model: string;
  serial_or_imei: string;
  price_inr: number;
  days_since_purchase: number | null;
  recommended_plan: string;
  plan_price_inr: number;
  notes_for_team: string;
  warrio_reply: string;
  status: string;
  source: "website" | "amazon";
  lead_reference: string;
};

export type N8nDelivery = "sent" | "skipped" | "failed";

export async function sendLeadToN8n(lead: LeadRow): Promise<N8nDelivery> {
  const url = process.env.N8N_LEADS_WEBHOOK_URL;
  if (!url) return "skipped";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.N8N_WEBHOOK_SECRET) {
    headers["X-Warrio-Secret"] = process.env.N8N_WEBHOOK_SECRET;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error("n8n lead webhook failed:", response.status);
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error(
      "n8n lead webhook error:",
      error instanceof Error ? error.message : error
    );
    return "failed";
  }
}
