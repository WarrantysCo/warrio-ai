// Shapes shared by the sales agent, the API routes and the website. Field names
// follow the Warrio v2 instructions (and the n8n "Warrio Leads" table) so the
// same record can move between the website and n8n unchanged.

export type InvoiceDetails = {
  seller: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  name_on_invoice: string | null;
  // Category id from the price list, or "other" when nothing fits.
  product_category: string;
  brand: string | null;
  model: string | null;
  serial_or_imei: string | null;
  price_inr: number | null;
  purchase_country: string | null;
};

export type PlanQuote = {
  id: string;
  category_id: string;
  category_name: string;
  // e.g. "TV 3-year plan"
  plan_name: string;
  tenure_years: number;
  label: string;
  price_inr: number;
};

export type EligibilityStatus = "eligible" | "ineligible" | "cannot_confirm";

export type SalesDecision = {
  eligibility_status: EligibilityStatus;
  eligibility_message: string;
  days_since_purchase: number | null;
  recommended_plan_id: string | null;
  recommended_plan: string | null;
  plan_price_inr: number | null;
  plan_options: PlanQuote[];
  team_notes: string[];
};

export type SalesAnalysis = Omit<SalesDecision, "team_notes"> & {
  is_invoice: boolean;
  invoice: InvoiceDetails;
  notes_for_team: string;
  reply: string;
};
