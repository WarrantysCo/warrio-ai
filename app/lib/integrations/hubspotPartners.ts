import "server-only";

// Read-only view of partner outreach, taken from the Companies in HubSpot that
// Arjun prepares and the n8n email sender updates. Needs HUBSPOT_ACCESS_TOKEN
// to have the "companies read" permission.

export type OutreachRow = {
  id: string;
  name: string;
  phone: string;
  website: string;
  status: string;
  hasEmailContact: boolean;
  lastEmailed: string | null;
  nextFollowUp: string | null;
};

export type OutreachResult =
  | { ok: true; rows: OutreachRow[] }
  | { ok: false; reason: "no_token" | "no_permission" | "failed" };

const PROPS = [
  "name",
  "phone",
  "domain",
  "warrio_partner_status",
  "partner_status",
  "warrio_next_follow_up",
  "partner_next_followup",
  "hs_last_logged_outgoing_email_date",
  "notes_last_contacted",
  "num_associated_contacts",
];

export async function readOutreach(): Promise<OutreachResult> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return { ok: false, reason: "no_token" };

  const rows: OutreachRow[] = [];
  let after: string | undefined;
  try {
    for (let page = 0; page < 5; page += 1) {
      const response = await fetch("https://api.hubapi.com/crm/v3/objects/companies/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          filterGroups: [{ filters: [{ propertyName: "partner_source_agent", operator: "HAS_PROPERTY" }] }],
          properties: PROPS,
          limit: 100,
          after,
        }),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) return { ok: false, reason: "no_permission" };
      if (!response.ok) return { ok: false, reason: "failed" };
      const data = (await response.json()) as {
        results?: { id: string; properties: Record<string, string | null> }[];
        paging?: { next?: { after?: string } };
      };
      for (const item of data.results ?? []) {
        const p = item.properties;
        rows.push({
          id: item.id,
          name: (p.name ?? "").replace(/^\[Partner prospect\]\s*/i, "") || "Unnamed",
          phone: p.phone ?? "",
          website: p.domain ?? "",
          status: (p.warrio_partner_status || p.partner_status || "new").toLowerCase(),
          hasEmailContact: Number(p.num_associated_contacts ?? 0) > 0,
          lastEmailed: p.hs_last_logged_outgoing_email_date || p.notes_last_contacted || null,
          nextFollowUp: p.warrio_next_follow_up || p.partner_next_followup || null,
        });
      }
      after = data.paging?.next?.after;
      if (!after) break;
    }
  } catch {
    return { ok: false, reason: "failed" };
  }
  return { ok: true, rows };
}
