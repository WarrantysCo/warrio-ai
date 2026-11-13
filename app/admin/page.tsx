import Link from "next/link";

import { readLeads } from "@/app/lib/integrations/leadStore";
import { PROBLEM_LABELS, readProblems } from "@/app/lib/monitoring/problems";
import { findStuckCustomers, STUCK_LABELS } from "@/app/lib/monitoring/stuck";
import { readWarrantyStatuses } from "@/app/lib/warranty/store";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function indiaDate(date: string | number | Date) {
  return new Date(date).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function indiaTime(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Tile({
  label,
  value,
  sub,
  href,
  tone = "plain",
}: {
  label: string;
  value: number;
  sub: string;
  href: string;
  tone?: "plain" | "good" | "warn" | "bad";
}) {
  const tones = {
    plain: "border-slate-200 bg-white",
    good: "border-emerald-200 bg-emerald-50",
    warn: "border-amber-300 bg-amber-50",
    bad: "border-red-300 bg-red-50",
  };
  return (
    <Link href={href} className={`block rounded-2xl border p-5 shadow-sm hover:shadow ${tones[tone]}`}>
      <div className="text-sm font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-4xl font-black text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </Link>
  );
}

// Amit's start page: today's numbers at the top, then what needs him now.
// Read outside the component: render must not call Date.now() itself.
async function loadDashboard() {
  const now = Date.now();
  const [leads, statuses, problems, stuck] = await Promise.all([
    readLeads(),
    readWarrantyStatuses(),
    readProblems(),
    findStuckCustomers(now),
  ]);
  return { now, leads, statuses, problems, stuck };
}

export default async function AdminHomePage() {
  const { now, leads, statuses, problems, stuck } = await loadDashboard();

  const today = indiaDate(now);
  const latestLeads = [...new Map(leads.map((lead) => [lead.lead_reference, lead])).values()];
  const ordersToday = latestLeads.filter((lead) => indiaDate(lead.date) === today).length;
  const allStatuses = [...statuses.values()];
  const paidToday = allStatuses.filter((s) => s.payment && indiaDate(s.payment.date) === today).length;
  const paidWeek = allStatuses.filter((s) => s.payment && now - new Date(s.payment.date).getTime() < 7 * DAY).length;
  const waitingApproval = allStatuses.filter((s) => s.details && !s.sent).length;
  const sentWeek = allStatuses.filter((s) => s.sent && now - new Date(s.sent.date).getTime() < 7 * DAY).length;
  const problemsDay = problems.filter((p) => now - new Date(p.date).getTime() < DAY);
  const recentOrders = latestLeads.slice(-8).reverse();

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 text-slate-900">
      <h1 className="text-2xl font-black">Good to see you, Amit</h1>
      <p className="mt-1 text-sm text-slate-600">
        Today is {new Date(now).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full" })}.
        Tap any box to open it.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <Tile label="New orders today" value={ordersToday} sub="Customers who picked a plan" href="/admin/leads" />
        <Tile
          label="Payments today"
          value={paidToday}
          sub={`${paidWeek} in the last 7 days`}
          href="/admin/warranty"
          tone={paidToday > 0 ? "good" : "plain"}
        />
        <Tile
          label="Certificates to approve"
          value={waitingApproval}
          sub={`${sentWeek} sent in the last 7 days`}
          href="/admin/warranty"
          tone={waitingApproval > 0 ? "warn" : "plain"}
        />
        <Tile
          label="Customers to follow up"
          value={stuck.length}
          sub="Stuck before finishing"
          href="/admin/problems#follow-up"
          tone={stuck.length > 0 ? "warn" : "good"}
        />
        <Tile
          label="Website problems (24h)"
          value={problemsDay.length}
          sub={problemsDay.length === 0 ? "All working" : "Tap to see what broke"}
          href="/admin/problems"
          tone={problemsDay.length > 0 ? "bad" : "good"}
        />
        <Tile label="All orders so far" value={latestLeads.length} sub="Download as Excel" href="/admin/leads" />
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Needs your attention</h2>
          {stuck.length === 0 && problemsDay.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-700">Nothing right now. Everything is running fine.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {stuck.slice(0, 5).map((row) => (
                <li key={`${row.reason}-${row.lead.lead_reference}`} className="rounded-lg bg-amber-50 p-3">
                  <div className="font-semibold">{STUCK_LABELS[row.reason].title}</div>
                  <div className="text-slate-700">
                    {row.lead.name || "No name"} · {row.lead.mobile || "no mobile"} · waiting {row.hoursWaiting}h
                  </div>
                </li>
              ))}
              {problemsDay.slice(0, 3).map((problem) => (
                <li key={`${problem.date}-${problem.kind}`} className="rounded-lg bg-red-50 p-3">
                  <div className="font-semibold text-red-800">{PROBLEM_LABELS[problem.kind]}</div>
                  <div className="text-slate-700">
                    {indiaTime(problem.date)}
                    {problem.mobile ? ` · ${problem.mobile}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/problems" className="mt-4 inline-block text-sm font-semibold text-brand-blue underline">
            See everything
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Latest orders</h2>
          {recentOrders.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No orders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {recentOrders.map((lead) => {
                const status = statuses.get(lead.lead_reference);
                const stage = status?.sent
                  ? { text: "Certificate sent", tone: "bg-emerald-100 text-emerald-800" }
                  : status?.details
                    ? { text: "Details received", tone: "bg-amber-100 text-amber-800" }
                    : status?.payment
                      ? { text: "Paid", tone: "bg-blue-100 text-blue-800" }
                      : lead.source === "amazon"
                        ? { text: "Amazon, waiting", tone: "bg-slate-100 text-slate-700" }
                        : { text: "Not paid yet", tone: "bg-slate-100 text-slate-700" };
                return (
                  <li key={lead.lead_reference} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <div className="font-semibold">{lead.name || "No name"}</div>
                      <div className="text-xs text-slate-500">
                        {lead.recommended_plan} · ₹{lead.plan_price_inr.toLocaleString("en-IN")} · {indiaTime(lead.date)}
                      </div>
                    </div>
                    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${stage.tone}`}>
                      {stage.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
