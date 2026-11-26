import { NextResponse } from "next/server";

import { adminAuthRequired, isAdminAllowed } from "@/app/lib/adminAuth";
import { sendManualFollowup } from "@/app/lib/followup/followup";
import { readLeads } from "@/app/lib/integrations/leadStore";
import { siteUrl } from "@/app/lib/warranty/link";

export const dynamic = "force-dynamic";

// "Email reminder" button: sends the follow-up email to one customer now.
export async function POST(request: Request) {
  if (!isAdminAllowed(request)) return adminAuthRequired();
  const form = await request.formData();
  const leadReference = String(form.get("leadReference") ?? "").trim();
  const lead = (await readLeads()).findLast((row) => row.lead_reference === leadReference);
  const sent = lead ? await sendManualFollowup(lead) : false;
  return NextResponse.redirect(new URL(`/admin/problems?reminder=${sent ? "sent" : "failed"}#follow-up`, siteUrl()), 303);
}
