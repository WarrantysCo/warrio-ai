import { NextResponse } from "next/server";

import { adminAuthRequired, isAdminAllowed } from "@/app/lib/adminAuth";
import { PARTNER_COMMISSION_PERCENT } from "@/app/data/partners";
import { approvePartner, partnerLink, pausePartner, readPartners } from "@/app/lib/partners/store";
import { renderPartnerQr } from "@/app/lib/partners/qr";
import { brandedHtml, sendMail } from "@/app/lib/warranty/email";
import { siteUrl } from "@/app/lib/warranty/link";

export const dynamic = "force-dynamic";

// Amit approves or pauses a partner. Approving gives the partner a code and
// emails them their link and QR code, so his click is the go-ahead.
export async function POST(request: Request) {
  if (!isAdminAllowed(request)) return adminAuthRequired();

  const form = await request.formData();
  const partnerId = String(form.get("partnerId") ?? "").trim();
  const action = String(form.get("action") ?? "");
  // Built from SITE_URL, not request.url (see the certificate send route).
  const back = new URL("/admin/partners", siteUrl());
  if (!/^PRT-\d{6}$/.test(partnerId)) return NextResponse.redirect(back, 303);

  const partner = (await readPartners()).find((row) => row.partner_id === partnerId);
  if (!partner) return NextResponse.redirect(back, 303);

  if (action === "pause") {
    await pausePartner(partnerId);
    back.searchParams.set("done", `${partner.business_name} paused`);
    return NextResponse.redirect(back, 303);
  }

  if (action === "approve" || action === "resend") {
    const wasApproved = partner.status === "approved";
    const approved = await approvePartner(partnerId);
    if (!approved) return NextResponse.redirect(back, 303);
    let emailed = wasApproved;
    if (!wasApproved || action === "resend") {
      const link = partnerLink(approved.code);
      const qr = await renderPartnerQr(approved.code);
      const body = [
        `Hi ${approved.owner_name},`,
        `Welcome to the Warrantys.co partner programme. ${approved.business_name} is now approved.`,
        `Your partner code is ${approved.code}.`,
        `Your personal link (share it with your customers):\n${link}`,
        "Your QR code is attached. Print it or show it on your phone: when a customer scans it, they can check their warranty and buy a plan, and the order is credited to you.",
        `You earn ${PARTNER_COMMISSION_PERCENT}% of the plan price on every paid, non-refunded order. Commission is paid monthly after the customer's 7-day refund window ends. Please reply to this email with your bank account or UPI details for payouts.`,
        "Our plans are for devices up to 9 months from the purchase date. Please share only the published plan terms and do not promise anything beyond them.",
        "Warrantys.co team",
      ];
      emailed = await sendMail({
        to: approved.email,
        subject: "You are approved: your Warrantys.co partner link and QR code",
        text: body.join("\n\n"),
        html: brandedHtml(body),
        attachments: [{ filename: `warrantys-partner-${approved.code}.png`, content: qr }],
      });
    }
    back.searchParams.set(emailed ? "done" : "error", emailed ? (action === "resend" ? `Link and QR emailed again to ${partner.business_name}` : `${partner.business_name} approved`) : `${partner.business_name} is approved but the email did not send. Use "Email link again" once email is working`);
  }
  return NextResponse.redirect(back, 303);
}
