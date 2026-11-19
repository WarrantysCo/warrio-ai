import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import {
  GST_PATTERN,
  PAN_PATTERN,
  PARTNER_BUSINESS_TYPES,
  PARTNER_COMMISSION_PERCENT,
  PARTNER_VOLUME_CHOICES,
} from "@/app/data/partners";
import { isSupportedInvoiceFile, MAX_INVOICE_UPLOAD_BYTES } from "@/app/lib/invoiceFile";
import { allowRequest } from "@/app/lib/locker/rateLimit";
import { reportProblem } from "@/app/lib/monitoring/problems";
import { savePartnerApplication, type PartnerApplication } from "@/app/lib/partners/store";
import { brandedHtml, leadUpdatesAddress, sendMail } from "@/app/lib/warranty/email";
import { siteUrl } from "@/app/lib/warranty/link";
import { saveInvoiceFile } from "@/app/lib/warranty/store";

export const dynamic = "force-dynamic";

function value(form: FormData, key: string, max = 200) {
  const entry = form.get(key);
  return typeof entry === "string" ? entry.trim().slice(0, max) : "";
}

// A business applies to become a partner. Nothing is live until Amit approves
// it at /admin/partners; this only saves the application and emails him.
export async function POST(request: Request) {
  try {
    if (!allowRequest(request, 10)) {
      return NextResponse.json({ success: false, message: "Too many tries. Please try again in an hour." }, { status: 429 });
    }
    const form = await request.formData();
    const proofEntry = form.get("proof");
    const proof = proofEntry instanceof File && proofEntry.size > 0 ? proofEntry : null;

    const businessName = value(form, "businessName", 120);
    const ownerName = value(form, "ownerName", 120);
    const mobile = value(form, "mobile");
    const email = value(form, "email");
    const businessType = value(form, "businessType");
    const city = value(form, "city", 80);
    const address = value(form, "address", 250);
    const website = value(form, "website");
    const gst = value(form, "gst").toUpperCase().replace(/\s/g, "");
    const pan = value(form, "pan").toUpperCase().replace(/\s/g, "");
    const registrationNo = value(form, "registrationNo", 40);
    const devicesPerMonth = value(form, "devicesPerMonth");

    const errors: string[] = [];
    if (!businessName) errors.push("Please enter your business name.");
    if (!ownerName) errors.push("Please enter the contact person's name.");
    if (!/^[6-9]\d{9}$/.test(mobile)) errors.push("Please enter a valid 10-digit mobile number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Please enter a valid email address.");
    if (!(PARTNER_BUSINESS_TYPES as readonly string[]).includes(businessType)) errors.push("Please choose your type of business.");
    if (!city) errors.push("Please enter your city.");
    if (!address) errors.push("Please enter your business address.");
    if (!(PARTNER_VOLUME_CHOICES as readonly string[]).includes(devicesPerMonth)) errors.push("Please choose how many devices you sell in a month.");
    if (gst && !GST_PATTERN.test(gst)) errors.push("Please check your GST number (15 characters).");
    if (pan && !PAN_PATTERN.test(pan)) errors.push("Please check your PAN (for example ABCDE1234F).");
    if (proof && proof.size > MAX_INVOICE_UPLOAD_BYTES) errors.push("Please upload a file smaller than 10 MB.");
    else if (proof && !isSupportedInvoiceFile(proof)) errors.push("Please upload the proof as a photo or a PDF.");
    if (value(form, "consent") !== "true") errors.push("Please tick the box to agree to the partner terms.");
    if (errors.length > 0) {
      return NextResponse.json({ success: false, message: errors.join(" ") }, { status: 400 });
    }

    const partnerId = `PRT-${randomInt(0, 1_000_000).toString().padStart(6, "0")}`;
    const proofFile = proof ? await saveInvoiceFile(partnerId, proof, "proof").catch(() => "") : "";
    const application: PartnerApplication = {
      type: "apply",
      date: new Date().toISOString(),
      partner_id: partnerId,
      business_name: businessName,
      owner_name: ownerName,
      mobile,
      email,
      business_type: businessType,
      city,
      address,
      website,
      gst,
      pan,
      registration_no: registrationNo,
      proof_file: proofFile,
      devices_per_month: devicesPerMonth,
    };

    if (!(await savePartnerApplication(application))) {
      await reportProblem({
        kind: "saving_failed",
        where: "/api/partners/register",
        message: `Could not save partner application from ${businessName} (${mobile})`,
        mobile,
      }).catch(() => {});
      return NextResponse.json(
        { success: false, message: "We could not save your details. Please try again in a few minutes." },
        { status: 500 }
      );
    }

    // Emails are best effort: the application is already saved.
    const teamBody = [
      `New partner application ${partnerId}`,
      `${businessName} (${businessType}), ${city}`,
      `Contact: ${ownerName}, ${mobile}, ${email}`,
      `GST: ${gst || "not given"} | PAN: ${pan || "not given"} | Registration no: ${registrationNo || "none"}`,
      `Proof file: ${proofFile || "none uploaded"}`,
      `Sells: ${devicesPerMonth}`,
      website ? `Link: ${website}` : "",
      "",
      `Review and approve at ${siteUrl()}/admin/partners`,
    ].filter((line, index) => line || index > 6);
    void sendMail({ to: leadUpdatesAddress(), subject: `New partner application: ${businessName}`, text: teamBody.join("\n") }).catch(() => {});

    const customerBody = [
      `Hi ${ownerName},`,
      `Thank you for registering ${businessName} as a Warrantys.co partner.`,
      "We will check your business details and email you your own partner link and QR code once you are approved. We usually do this within 2 working days.",
      `As a partner you earn ${PARTNER_COMMISSION_PERCENT}% of the plan price on every paid, non-refunded order that comes through your link or QR code.`,
      "Warrantys.co team",
    ];
    void sendMail({
      to: email,
      subject: "We received your Warrantys.co partner registration",
      text: customerBody.join("\n\n"),
      html: brandedHtml(customerBody),
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    await reportProblem({
      kind: "form_failed",
      where: "/api/partners/register",
      message: error instanceof Error ? error.message : "Unknown partner form error",
    }).catch(() => {});
    return NextResponse.json({ success: false, message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
