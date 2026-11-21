import { PARTNER_COMMISSION_PERCENT, PARTNER_REFUND_WINDOW_DAYS } from "@/app/data/partners";
import { readLeads, type StoredLead } from "@/app/lib/integrations/leadStore";
import { partnerLink, readPartners, type Partner } from "@/app/lib/partners/store";
import { readLockerRecords } from "@/app/lib/locker/store";
import { readWarrantyStatuses, type WarrantyStatus } from "@/app/lib/warranty/store";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function rupees(amount: number) {
  return `Rs ${Math.round(amount).toLocaleString("en-IN")}`;
}

type Sales = { orders: number; paid: number; paidValue: number; due: number; waiting: number };

function salesByPartner(leads: StoredLead[], statuses: Map<string, WarrantyStatus>) {
  const now = Date.now();
  const sales = new Map<string, Sales>();
  for (const lead of leads) {
    if (!lead.partner_code) continue;
    const row = sales.get(lead.partner_code) ?? { orders: 0, paid: 0, paidValue: 0, due: 0, waiting: 0 };
    row.orders += 1;
    const payment = statuses.get(lead.lead_reference)?.payment;
    if (payment) {
      row.paid += 1;
      row.paidValue += lead.plan_price_inr;
      const commission = (lead.plan_price_inr * PARTNER_COMMISSION_PERCENT) / 100;
      const paidAt = new Date(payment.date).getTime();
      if (now - paidAt >= PARTNER_REFUND_WINDOW_DAYS * DAY_MS) row.due += commission;
      else row.waiting += commission;
    }
    sales.set(lead.partner_code, row);
  }

  return sales;
}

function DecisionForm({ partner, action, label, tone }: { partner: Partner; action: string; label: string; tone: string }) {
  return (
    <form action="/api/admin/partners/decide" method="post">
      <input type="hidden" name="partnerId" value={partner.partner_id} />
      <input type="hidden" name="action" value={action} />
      <button className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${tone}`}>{label}</button>
    </form>
  );
}

export default async function PartnersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const [{ done, error }, partners, leads, statuses, lockerRecords] = await Promise.all([
    searchParams,
    readPartners(),
    readLeads(),
    readWarrantyStatuses(),
    readLockerRecords(),
  ]);
  const checks = new Map<string, number>();
  for (const record of lockerRecords) {
    if (record.partner_code) checks.set(record.partner_code, (checks.get(record.partner_code) ?? 0) + 1);
  }

  const sales = salesByPartner(leads, statuses);

  const pending = partners.filter((partner) => partner.status === "pending");
  const others = partners.filter((partner) => partner.status !== "pending");

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 text-slate-900">
      <h1 className="text-2xl font-black">Partners</h1>
      <p className="mt-1 text-sm text-slate-600">
        Businesses that registered on warrantys.co/partners. Check their details, then approve: the partner is emailed
        their link and QR code straight away.
      </p>
      {done && <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{done}.</div>}
      {error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}.</div>}

      <h2 className="mt-8 text-lg font-black">Waiting for your approval ({pending.length})</h2>
      {pending.length === 0 && <p className="mt-2 text-sm text-slate-500">No new applications.</p>}
      <div className="mt-3 space-y-4">
        {pending.map((partner) => (
          <div key={partner.partner_id} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold">{partner.business_name}</div>
                <div className="text-sm text-slate-600">
                  {partner.business_type} · {partner.city} · applied {new Date(partner.applied_at).toLocaleDateString("en-IN")} · {partner.partner_id}
                </div>
              </div>
              <DecisionForm partner={partner} action="approve" label="Approve and email link + QR" tone="bg-emerald-600" />
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div><dt className="inline font-semibold">Contact: </dt><dd className="inline">{partner.owner_name}, {partner.mobile}, {partner.email}</dd></div>
              <div><dt className="inline font-semibold">Address: </dt><dd className="inline">{partner.address}</dd></div>
              <div><dt className="inline font-semibold">GST: </dt><dd className="inline">{partner.gst || "not given"}</dd></div>
              <div><dt className="inline font-semibold">PAN: </dt><dd className="inline">{partner.pan || "not given"}</dd></div>
              <div><dt className="inline font-semibold">Registration no: </dt><dd className="inline">{partner.registration_no || "none"}</dd></div>
              <div><dt className="inline font-semibold">Sells: </dt><dd className="inline">{partner.devices_per_month}</dd></div>
              {partner.website && <div><dt className="inline font-semibold">Link: </dt><dd className="inline break-all">{partner.website}</dd></div>}
              <div>
                <dt className="inline font-semibold">Proof: </dt>
                <dd className="inline">
                  {partner.proof_file ? (
                    <a className="text-blue-700 underline" href={`/api/admin/warranty/invoice?file=${encodeURIComponent(partner.proof_file)}`} target="_blank">
                      open uploaded proof
                    </a>
                  ) : (
                    "none uploaded"
                  )}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-black">Approved and paused partners ({others.length})</h2>
      <p className="mt-1 text-xs text-slate-500">
        Commission is {PARTNER_COMMISSION_PERCENT}% of the plan price, due {PARTNER_REFUND_WINDOW_DAYS} days after the customer
        paid. Before paying, check whether tax (TDS) has to be deducted, and collect the partner&apos;s bank or UPI details.
      </p>
      {others.length === 0 && <p className="mt-2 text-sm text-slate-500">No approved partners yet.</p>}
      <div className="mt-3 space-y-4">
        {others.map((partner) => {
          const stats = sales.get(partner.code) ?? { orders: 0, paid: 0, paidValue: 0, due: 0, waiting: 0 };
          return (
            <div key={partner.partner_id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">
                    {partner.business_name}{" "}
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${partner.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {partner.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {partner.owner_name}, {partner.mobile}, {partner.email} · {partner.city}
                  </div>
                  <div className="mt-1 break-all text-xs text-slate-500">
                    Code <b>{partner.code}</b> · {partnerLink(partner.code)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold" href={`/api/admin/partners/qr?code=${partner.code}`} target="_blank">
                    QR code
                  </a>
                  {partner.status === "approved" ? (
                    <>
                      <DecisionForm partner={partner} action="resend" label="Email link again" tone="bg-blue-600" />
                      <DecisionForm partner={partner} action="pause" label="Pause" tone="bg-slate-600" />
                    </>
                  ) : (
                    <DecisionForm partner={partner} action="approve" label="Resume" tone="bg-emerald-600" />
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-5">
                <div className="rounded-xl bg-slate-50 p-2"><div className="text-lg font-black">{checks.get(partner.code) ?? 0}</div>free bill checks</div>
                <div className="rounded-xl bg-slate-50 p-2"><div className="text-lg font-black">{stats.orders}</div>orders started</div>
                <div className="rounded-xl bg-slate-50 p-2"><div className="text-lg font-black">{stats.paid}</div>paid ({rupees(stats.paidValue)})</div>
                <div className="rounded-xl bg-amber-50 p-2"><div className="text-lg font-black">{rupees(stats.waiting)}</div>waiting for refund window</div>
                <div className="rounded-xl bg-emerald-50 p-2"><div className="text-lg font-black">{rupees(stats.due)}</div>due to pay</div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
