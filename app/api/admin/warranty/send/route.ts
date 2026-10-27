import { NextResponse } from "next/server";

import { adminAuthRequired, isAdminAllowed } from "@/app/lib/adminAuth";
import { logCertificateEmailToHubSpot } from "@/app/lib/integrations/hubspot";
import { readLeads } from "@/app/lib/integrations/leadStore";
import { buildCertificatePdf } from "@/app/lib/warranty/certificate";
import { sendCertificateEmail } from "@/app/lib/warranty/email";
import { readWarrantyStatus, saveWarrantyRecord } from "@/app/lib/warranty/store";

export const dynamic = "force-dynamic";

function getTenure(planName: string) {
  const match = planName.match(/(\d+)-year/);
  return match ? Number(match[1]) : 1;
}

export async function POST(request: Request) {
  if (!isAdminAllowed(request)) return adminAuthRequired();

  const form = await request.formData();
  const leadReference = String(form.get("leadReference") ?? "").trim();
  const planStartDate = String(form.get("planStartDate") ?? "").trim();
  const planEndDate = String(form.get("planEndDate") ?? "").trim();

  const back = new URL("/admin/warranty", request.url);
  if (!leadReference) return NextResponse.redirect(back, 303);

  const lead = (await readLeads()).findLast((row) => row.lead_reference === leadReference);
  const status = await readWarrantyStatus(leadReference);
  const details = status.details;
  if (!lead || !details) return NextResponse.redirect(back, 303);

  const pdf = await buildCertificatePdf({
    orderId: leadReference,
    customerName: details.name || lead.name,
    email: details.email || lead.email,
    phone: details.mobile || lead.mobile,
    deviceCategory: lead.product_category,
    deviceName: details.device_name,
    brand: details.brand,
    model: details.model,
    serialOrImei: details.serial_or_imei,
    planName: lead.recommended_plan,
    tenureYears: getTenure(lead.recommended_plan),
    devicePurchaseDate: details.device_purchase_date,
    planPurchaseDate: (status.payment?.date ?? details.date).slice(0, 10),
    planStartDate: planStartDate || (status.payment?.date ?? details.date).slice(0, 10),
    planEndDate: planEndDate || (status.payment?.date ?? details.date).slice(0, 10),
  });

  const email = details.email || lead.email;
  const result = await sendCertificateEmail({
    to: email,
    customerName: details.name || lead.name,
    orderId: leadReference,
    pdf,
    fileName: `Warrantys.co-${leadReference}.pdf`,
  });

  if (result.ok) {
    const sentAt = Date.now();
    await Promise.all([
      saveWarrantyRecord({
        type: "sent",
        date: new Date(sentAt).toISOString(),
        lead_reference: leadReference,
        email,
        plan_start_date: planStartDate,
        plan_end_date: planEndDate,
      }),
      logCertificateEmailToHubSpot({
        email,
        mobile: details.mobile || lead.mobile,
        subject: `Warranty certificate sent - Order ${leadReference}`,
        body: `Certificate emailed to ${email} for ${lead.recommended_plan} (${leadReference}).`,
        sentAt,
      }),
    ]);
  }

  back.searchParams.set(result.ok ? "sent" : "error", leadReference);
  return NextResponse.redirect(back, 303);
}
