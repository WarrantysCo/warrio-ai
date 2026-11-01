import { readChatSessions } from "@/app/lib/chats/store";
import { readLeads } from "@/app/lib/integrations/leadStore";

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

// Every customer's chat with Warrio, newest first. Chats from customers who
// gave their name and mobile are marked with the lead; the others are people
// who chatted and left.
export default async function ChatsPage() {
  const [sessions, leads] = await Promise.all([readChatSessions(), readLeads()]);
  const byRef = new Map(leads.map((lead) => [lead.lead_reference, lead]));

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 text-slate-900">
      <h1 className="text-2xl font-black">Customer chats with Warrio</h1>
      <p className="mt-1 text-sm text-slate-600">
        Everything customers asked Warrio and what Warrio answered. Chats that ended in an order show the lead number.
        Only chats from 1 Nov 2026 onward are saved.
      </p>
      {sessions.length === 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-sm">No chats saved yet.</div>
      )}
      <div className="mt-6 space-y-4">
        {sessions.map((session) => {
          const lead = session.lead_reference ? byRef.get(session.lead_reference) : undefined;
          return (
            <section
              key={session.chat_id}
              id={session.lead_reference}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold">
                  {lead ? `${lead.name} · ${lead.mobile} · ${session.lead_reference}` : "Visitor who did not give a name or mobile"}
                </div>
                <div className="text-xs text-slate-500">{indiaTime(session.started)}</div>
              </div>
              {lead && (
                <div className="text-xs text-slate-500">
                  {lead.recommended_plan} · Rs {lead.plan_price_inr}
                  {lead.email ? ` · ${lead.email}` : ""}
                </div>
              )}
              <ul className="mt-3 space-y-2 text-sm">
                {session.lines
                  .filter((line) => line.kind !== "linked")
                  .map((line, index) => (
                    <li
                      key={`${line.date}-${index}`}
                      className={`rounded-lg px-3 py-2 ${
                        line.kind === "customer"
                          ? "bg-blue-50"
                          : line.kind === "warrio"
                            ? "bg-emerald-50"
                            : "bg-slate-50 text-xs text-slate-600"
                      }`}
                    >
                      <span className="font-semibold">
                        {line.kind === "customer" ? "Customer" : line.kind === "warrio" ? "Warrio" : "Step"}
                      </span>{" "}
                      <span className="text-xs text-slate-500">{indiaTime(line.date)}</span>
                      <div className="whitespace-pre-wrap">{line.text}</div>
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
