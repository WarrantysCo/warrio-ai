import { readLeads } from "@/app/lib/integrations/leadStore";
import { planEndDate, planStartDate } from "@/app/lib/warranty/certificate";
import { readWarrantyQueue } from "@/app/lib/warranty/store";

export const dynamic = "force-dynamic";

export default async function WarrantyAdminPage() {
  const [queue, leads] = await Promise.all([readWarrantyQueue(), readLeads()]);
  const leadByRef = new Map(leads.map((lead) => [lead.lead_reference, lead]));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-slate-900">
      <h1 className="text-2xl font-black">Warranty certificates</h1>
      <p className="mt-1 text-sm text-slate-600">
        Customers who sent their details, newest first. Check the dates, then
        approve to email the certificate and log it in HubSpot.
      </p>
      <p className="mt-2 text-xs text-amber-700">
        Plan start date defaults to 1 year after the plan was purchased. If
        the customer&apos;s device has a 2- or 3-year manufacturer warranty,
        change the date below and send again.
      </p>

      <div className="mt-8 space-y-4">
        {queue.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-600">
            No submissions yet.
          </div>
        )}
        {queue.map((row) => {
          const lead = leadByRef.get(row.lead_reference);
          const details = row.details!;
          const planPurchaseDate = (row.payment?.date ?? details.date).slice(0, 10);
          const start = planStartDate(planPurchaseDate);
          const end = planEndDate(start, lead?.recommended_plan ? getTenure(lead) : 1);
          return (
            <form
              key={row.lead_reference}
              action="/api/admin/warranty/send"
              method="post"
              className="rounded-xl border border-slate-200 bg-white p-5 text-sm"
            >
              <input type="hidden" name="leadReference" value={row.lead_reference} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-base font-bold">
                  {details.name} · {row.lead_reference}
                </div>
                {row.sent && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Sent {new Date(row.sent.date).toLocaleDateString("en-IN")}
                  </span>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>Email: {details.email}</div>
                <div>Mobile: {details.mobile}</div>
                <div>Device: {details.device_name} ({details.brand} {details.model})</div>
                <div>Serial/IMEI: {details.serial_or_imei}</div>
                <div>Plan: {lead?.recommended_plan ?? "unknown"}</div>
                <div>Device purchase date: {details.device_purchase_date}</div>
                {details.notes_for_team && (
                  <div className="sm:col-span-2 rounded-lg bg-amber-50 p-2 text-amber-800">
                    {details.notes_for_team}
                  </div>
                )}
                {details.invoice_file && (
                  <div className="sm:col-span-2">
                    <a
                      href={`/api/admin/warranty/invoice?file=${encodeURIComponent(details.invoice_file)}`}
                      className="font-semibold text-brand-blue underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View uploaded bill
                    </a>
                  </div>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Plan start date</span>
                  <input
                    type="date"
                    name="planStartDate"
                    defaultValue={start}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Plan end date</span>
                  <input
                    type="date"
                    name="planEndDate"
                    defaultValue={end}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="mt-4 rounded-xl bg-brand-blue px-4 py-2 font-bold text-white hover:bg-brand-blue-dark"
              >
                {row.sent ? "Re-send certificate" : "Approve and send certificate"}
              </button>
            </form>
          );
        })}
      </div>
    </main>
  );
}

function getTenure(lead: { recommended_plan: string }) {
  const match = lead.recommended_plan.match(/(\d+)-year/);
  return match ? Number(match[1]) : 1;
}
