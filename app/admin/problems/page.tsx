import { PROBLEM_LABELS, readProblems } from "@/app/lib/monitoring/problems";
import { findStuckCustomers, STUCK_LABELS, type StuckReason } from "@/app/lib/monitoring/stuck";

export const dynamic = "force-dynamic";

function indiaTime(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function whatsAppLink(mobile: string, name: string, formLink: string) {
  const text = `Hi ${name || ""}, thank you for buying your Warrantys.co plan. Please add your device details here so we can send your warranty certificate: ${formLink}`;
  return `https://wa.me/91${mobile}?text=${encodeURIComponent(text)}`;
}

// Everything that went wrong for customers, and everyone who got stuck
// before finishing, so the team can call them.
export default async function ProblemsPage() {
  const [problems, stuck] = await Promise.all([readProblems(), findStuckCustomers()]);
  const setup = [
    { name: "Problem alert emails", on: Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) && process.env.ALERT_EMAILS !== "off", to: process.env.ALERT_EMAIL || "business@warrantys.co" },
    { name: "Razorpay payment safety net", on: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET) },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 text-slate-900">
      <h1 className="text-2xl font-black">Problems &amp; follow-ups</h1>
      <p className="mt-1 text-sm text-slate-600">
        Customers who got stuck, and every error a customer hit on the website.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {setup.map((item) => (
          <span
            key={item.name}
            className={`rounded-full px-3 py-1 font-semibold ${item.on ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}
          >
            {item.name}: {item.on ? `ON${item.to ? ` (to ${item.to})` : ""}` : "OFF, not set up yet"}
          </span>
        ))}
      </div>

      <section id="follow-up" className="mt-8">
        <h2 className="text-xl font-bold">Customers to follow up ({stuck.length})</h2>
        {stuck.length === 0 && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-emerald-700">
            Nobody is stuck right now.
          </div>
        )}
        {(Object.keys(STUCK_LABELS) as StuckReason[]).map((reason) => {
          const group = stuck.filter((row) => row.reason === reason);
          if (group.length === 0) return null;
          return (
            <div key={reason} className="mt-4 rounded-2xl border border-amber-200 bg-white p-5">
              <div className="font-bold">
                {STUCK_LABELS[reason].title} ({group.length})
              </div>
              <div className="text-xs text-slate-600">{STUCK_LABELS[reason].help}</div>
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {group.map((row) => (
                  <li key={row.lead.lead_reference} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <div className="font-semibold">
                        {row.lead.name || "No name"} · {row.lead.lead_reference}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.lead.recommended_plan} · {row.lead.mobile || "no mobile"}
                        {row.lead.email ? ` · ${row.lead.email}` : ""} · since {indiaTime(row.since)} ({row.hoursWaiting}h)
                      </div>
                      {row.note && <div className="mt-1 text-xs font-semibold text-red-700">{row.note}</div>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.lead.mobile && row.reason !== "amazon_no_details" && (
                        <a href={`tel:+91${row.lead.mobile}`} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold">
                          Call
                        </a>
                      )}
                      {row.lead.mobile && row.formLink && (
                        <a
                          href={whatsAppLink(row.lead.mobile, row.lead.name, row.formLink)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                        >
                          WhatsApp form link
                        </a>
                      )}
                      {row.reason === "awaiting_approval" && (
                        <a href="/admin/warranty" className="rounded-lg bg-brand-blue px-3 py-1 text-xs font-semibold text-white">
                          Approve
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Website problems ({problems.length})</h2>
        <p className="text-xs text-slate-600">Newest first. You also get an email when one happens.</p>
        {problems.length === 0 ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-emerald-700">
            No problems so far.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {problems.map((problem, index) => (
              <li key={`${problem.date}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-red-800">{PROBLEM_LABELS[problem.kind] ?? problem.kind}</div>
                  <div className="text-xs text-slate-500">{indiaTime(problem.date)}</div>
                </div>
                <div className="mt-1 text-slate-700">{problem.message}</div>
                <div className="mt-1 text-xs text-slate-500">
                  Where: {problem.where || "unknown"}
                  {problem.lead_reference ? ` · Order ${problem.lead_reference}` : ""}
                  {problem.mobile ? ` · Mobile ${problem.mobile}` : ""}
                  {problem.source === "browser" ? " · seen on customer's phone/computer" : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
