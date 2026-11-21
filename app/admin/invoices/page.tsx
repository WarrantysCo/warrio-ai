import { readInvoices } from "@/app/lib/invoices/store";
import { readLeads } from "@/app/lib/integrations/leadStore";
import { readWarrantyStatuses } from "@/app/lib/warranty/store";

import { PageHeader, StatTile } from "../ui";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const [{ done, error }, leads, statuses, invoices] = await Promise.all([
    searchParams,
    readLeads(),
    readWarrantyStatuses(),
    readInvoices(),
  ]);
  const leadByRef = new Map(leads.map((lead) => [lead.lead_reference, lead]));
  const connected = Boolean(process.env.INVOICE_API_URL);

  const requested = [...statuses.values()]
    .filter((s) => s.payment && s.details?.invoice_requested)
    .sort((a, b) => new Date(b.payment!.date).getTime() - new Date(a.payment!.date).getTime());

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 text-slate-900">
      <PageHeader
        title="GST invoices"
        subtitle="Only customers who ticked 'I need a GST invoice' appear here. Create the invoice, check the PDF, then press Approve & send. Your signature goes on only when you press Approve."
      />
      {done && <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{done}</div>}
      {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</div>}
      {!connected && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          The Create button is not connected to the invoice server yet. Ved is finishing that. Customer details below
          are ready.
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatTile label="Invoices requested" value={requested.length} tone={requested.length > 0 ? "warn" : "plain"} />
      </div>

      <div className="space-y-4">
        {requested.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No customer has asked for an invoice yet.
          </div>
        )}
        {requested.map((status) => {
          const details = status.details!;
          const lead = leadByRef.get(details.lead_reference);
          const invoice = invoices.get(details.lead_reference);
          return (
            <div key={details.lead_reference} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {details.lead_reference}
                  </div>
                  <div className="text-lg font-bold">{details.billing_name || details.name}</div>
                  <div className="mt-1 max-w-md text-sm text-slate-700">{details.billing_address}</div>
                  <div className="text-sm text-slate-700">
                    {details.billing_state}
                    {details.buyer_gstin ? ` · GSTIN ${details.buyer_gstin}` : " · no GSTIN"}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {lead ? `${lead.recommended_plan} · Rs ${lead.plan_price_inr.toLocaleString("en-IN")} incl. GST` : ""}
                    {details.email ? ` · ${details.email}` : ""}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {invoice ? (
                    <>
                      <span className="text-sm font-bold text-slate-700">{invoice.invoice_no}</span>
                      <a
                        href={`/api/admin/invoices/pdf?invoice=${encodeURIComponent(invoice.invoice_no)}`}
                        className="text-sm font-semibold text-brand-blue underline"
                      >
                        View PDF
                      </a>
                      {invoice.approved ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          Signed and sent
                        </span>
                      ) : (
                        <form action="/api/admin/invoices/approve" method="post">
                          <input type="hidden" name="leadReference" value={details.lead_reference} />
                          <button className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700">
                            Approve &amp; send
                          </button>
                        </form>
                      )}
                    </>
                  ) : (
                    <form action="/api/admin/invoices/create" method="post">
                      <input type="hidden" name="leadReference" value={details.lead_reference} />
                      <button
                        disabled={!connected}
                        className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        Create invoice
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
