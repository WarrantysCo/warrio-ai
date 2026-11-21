import { readOutreach } from "@/app/lib/integrations/hubspotPartners";

import { PageHeader, StatTile } from "../ui";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { label: string; tone: string }> = {
  new: { label: "Not emailed yet", tone: "bg-slate-100 text-slate-700" },
  contacted: { label: "Email sent, no reply", tone: "bg-amber-100 text-amber-800" },
  replied: { label: "Replied", tone: "bg-emerald-100 text-emerald-800" },
  interested: { label: "Interested", tone: "bg-emerald-100 text-emerald-800" },
  registered: { label: "Registered", tone: "bg-emerald-200 text-emerald-900" },
  active: { label: "Active partner", tone: "bg-emerald-200 text-emerald-900" },
  stopped: { label: "Asked to stop", tone: "bg-red-100 text-red-800" },
  stop: { label: "Asked to stop", tone: "bg-red-100 text-red-800" },
  bounced: { label: "Email bounced", tone: "bg-red-100 text-red-800" },
};

function day(value: string | null) {
  if (!value) return "-";
  const date = new Date(/^\d+$/.test(value) ? Number(value) : value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
}

const MESSAGES = {
  no_token: "The website is not connected to HubSpot yet.",
  no_permission:
    "HubSpot said the website key may not read Companies. Ask Ved to switch on the Companies permission for it, then reload.",
  failed: "HubSpot did not answer. Please reload in a minute.",
} as const;

export default async function OutreachPage() {
  const result = await readOutreach();

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader title="Partner outreach" subtitle="Who we have emailed and who replied." />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
          {MESSAGES[result.reason]}
        </div>
      </main>
    );
  }

  const rows = result.rows;
  const emailed = rows.filter((r) => r.status !== "new").length;
  const replied = rows.filter((r) => ["replied", "interested", "registered", "active"].includes(r.status)).length;
  const phoneOnly = rows.filter((r) => !r.hasEmailContact).length;
  const stopped = rows.filter((r) => ["stop", "stopped", "bounced"].includes(r.status)).length;
  const order = ["replied", "interested", "registered", "active", "contacted", "new", "bounced", "stop", "stopped"];
  const sorted = [...rows].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Partner outreach"
        subtitle="Every shop Arjun found, whether we emailed them, and whether they replied. Updated live from HubSpot."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatTile label="Shops found" value={rows.length} />
        <StatTile label="Emailed" value={emailed} tone="info" />
        <StatTile label="Replied" value={replied} tone={replied > 0 ? "good" : "plain"} />
        <StatTile label="No email yet (phone only)" value={phoneOnly} tone={phoneOnly > 0 ? "warn" : "plain"} />
        <StatTile label="Stopped or bounced" value={stopped} tone={stopped > 0 ? "bad" : "plain"} />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last emailed</th>
              <th className="px-4 py-3">Reminder due</th>
              <th className="px-4 py-3">Phone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-slate-500">
                  No prospects yet.
                </td>
              </tr>
            )}
            {sorted.map((row) => {
              const style = STATUS_STYLE[row.status] ?? { label: row.status, tone: "bg-slate-100 text-slate-700" };
              return (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{row.name}</div>
                    <div className="text-xs text-slate-500">
                      {row.website || "no website"} · {row.hasEmailContact ? "has email" : "no email"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.tone}`}>{style.label}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{day(row.lastEmailed)}</td>
                  <td className="px-4 py-3 text-slate-700">{day(row.nextFollowUp)}</td>
                  <td className="px-4 py-3 text-slate-700">{row.phone || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Replies arrive in your Gmail and are saved to HubSpot. Anyone who writes STOP is never emailed again.
      </p>
    </main>
  );
}
