import { adminAuthRequired, isAdminAllowed } from "@/app/lib/adminAuth";
import { readLeads } from "@/app/lib/integrations/leadStore";

// Downloads every website lead as a CSV file that opens in Excel. The browser
// asks for a password: any user name, and the ADMIN_PASSWORD set on the host.

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  // A leading = + - @ would run as a formula in Excel.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  if (!isAdminAllowed(request)) return adminAuthRequired();

  const leads = await readLeads();
  const columns = [
    "date",
    "lead_reference",
    "name",
    "mobile",
    "email",
    "product_category",
    "brand",
    "model",
    "serial_or_imei",
    "price_inr",
    "recommended_plan",
    "plan_price_inr",
    "payment_link",
    "seller",
    "invoice_number",
    "invoice_date",
    "days_since_purchase",
    "status",
    "notes_for_team",
  ] as const;

  const rows = [
    columns.join(","),
    ...leads.reverse().map((lead) => columns.map((key) => csvCell(lead[key])).join(",")),
  ];

  return new Response(`﻿${rows.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="warrio-leads.csv"',
      "Cache-Control": "no-store",
    },
  });
}
