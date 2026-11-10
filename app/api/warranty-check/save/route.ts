import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import { daysSincePurchase, getCategory, isWithinPurchaseWindow, quotePlans } from "@/app/lib/agents/sales/pricing";
import { sendLeadToHubSpotDetailed } from "@/app/lib/integrations/hubspot";
import { isSupportedInvoiceFile, MAX_INVOICE_UPLOAD_BYTES } from "@/app/lib/invoiceFile";
import { formatDate, isIsoDate, WARRANTY_MONTH_CHOICES, warrantyEndDate } from "@/app/lib/locker/dates";
import { allowRequest } from "@/app/lib/locker/rateLimit";
import { saveLockerRecord, type LockerRecord } from "@/app/lib/locker/store";
import { reportProblem } from "@/app/lib/monitoring/problems";
import { brandedHtml, leadUpdatesAddress, sendMail } from "@/app/lib/warranty/email";
import { saveInvoiceFile } from "@/app/lib/warranty/store";

export const dynamic = "force-dynamic";

function value(form: FormData, key: string) {
  const entry = form.get(key);
  return typeof entry === "string" ? entry.trim().slice(0, 200) : "";
}

// Saves a bill in the Free Bill Locker: the file, the warranty end date and
// who to remind. Also tells Amit and adds the person to HubSpot as a lead.
export async function POST(request: Request) {
  try {
    if (!allowRequest(request, 20)) {
      return NextResponse.json({ success: false, message: "Too many tries. Please try again in an hour." }, { status: 429 });
    }
    const form = await request.formData();
    const invoiceEntry = form.get("invoice");
    const invoice = invoiceEntry instanceof File && invoiceEntry.size > 0 ? invoiceEntry : null;
    const name = value(form, "fullName");
    const mobile = value(form, "mobile");
    const email = value(form, "email");
    const purchaseDate = value(form, "purchaseDate");
    const months = Number(value(form, "warrantyMonths"));
    const priceInr = Number(value(form, "priceInr"));
    const category = getCategory(value(form, "categoryId"));
    const errors: string[] = [];

    if (!name) errors.push("Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(mobile)) errors.push("Please enter a valid 10-digit mobile number.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Please check your email address.");
    if (!isIsoDate(purchaseDate) || (daysSincePurchase(purchaseDate) ?? -1) < 0) {
      errors.push("Please enter the date you bought the device.");
    }
    if (!(WARRANTY_MONTH_CHOICES as readonly number[]).includes(months)) errors.push("Please choose the brand warranty length.");
    if (value(form, "consent") !== "true") errors.push("Please tick the box so we can save your bill.");
    if (!invoice) errors.push("Please upload your bill.");
    else if (invoice.size > MAX_INVOICE_UPLOAD_BYTES) errors.push("Please upload a file smaller than 10 MB.");
    else if (!isSupportedInvoiceFile(invoice)) errors.push("Please upload a photo or a PDF.");

    const endDate = warrantyEndDate(purchaseDate, months);
    if (errors.length > 0 || !invoice || !endDate) {
      return NextResponse.json({ success: false, message: errors.join(" ") }, { status: 400 });
    }

    const reference = `WBL-${randomInt(0, 1_000_000).toString().padStart(6, "0")}`;
    const savedName = await saveInvoiceFile(reference, invoice).catch(() => "");
    const price = Number.isFinite(priceInr) && priceInr > 0 ? Math.round(priceInr) : null;
    const record: LockerRecord = {
      date: new Date().toISOString(),
      locker_reference: reference,
      name,
      mobile,
      email,
      device_name: value(form, "deviceName"),
      brand: value(form, "brand"),
      model: value(form, "model"),
      category_id: category?.id ?? "",
      price_inr: price,
      purchase_date: purchaseDate,
      warranty_months: months,
      warranty_end_date: endDate,
      invoice_file: savedName,
    };
    const saved = savedName !== "" && (await saveLockerRecord(record));
    if (!saved) {
      await reportProblem({
        kind: "saving_failed",
        where: "/api/warranty-check/save",
        message: "A Bill Locker bill was not saved on our server.",
        lead_reference: reference,
        mobile,
      });
      return NextResponse.json(
        { success: false, message: "We could not save your bill just now. Please try again." },
        { status: 500 }
      );
    }

    const device = record.device_name || [record.brand, record.model].filter(Boolean).join(" ") || "device";
    const plans = category && price !== null && isWithinPurchaseWindow(purchaseDate) ? quotePlans(category.id, price) : [];
    const cheapest = [...plans].sort((a, b) => a.price_inr - b.price_inr)[0];
    const attachment = { filename: savedName, content: Buffer.from(await invoice.arrayBuffer()) };

    // The answer goes back to the customer right away; the emails and HubSpot
    // follow on their own and can never fail the save.
    void (async () => {
      await sendLeadToHubSpotDetailed({
        date: record.date,
        name,
        mobile,
        email,
        question: "",
        invoice_ok: true,
        invoice_file: savedName,
        seller: null,
        invoice_number: null,
        invoice_date: purchaseDate,
        name_on_invoice: null,
        product_category: category?.name ?? "Not in price list",
        brand: record.brand,
        model: record.model || record.device_name,
        serial_or_imei: "",
        price_inr: price ?? 0,
        days_since_purchase: daysSincePurchase(purchaseDate),
        recommended_plan: "Bill Locker",
        plan_price_inr: cheapest?.price_inr ?? 0,
        notes_for_team: `Saved a bill in the Free Bill Locker, has not ordered a plan. Brand warranty ends ${endDate}. ${
          cheapest ? `Can still buy: plans from Rs ${cheapest.price_inr}.` : "Cannot buy a plan for this device (too old or not in the price list)."
        }`,
        warrio_reply: "",
        status: "bill_locker",
        source: "website",
        lead_reference: reference,
        payment_link: "",
      });
      await sendMail({
        to: leadUpdatesAddress(),
        subject: `Bill Locker ${reference}: ${name}, ${device}${cheapest ? ` (can buy, from Rs ${cheapest.price_inr})` : ""}`,
        text: [
          `Someone saved a bill in the Free Bill Locker on warrantys.co.`,
          ``,
          `Reference: ${reference}`,
          `Customer: ${name}, ${mobile}${email ? `, ${email}` : ", no email (no reminders)"}`,
          `Device: ${device}${category ? ` (${category.name})` : ""}${price !== null ? `, Rs ${price}` : ""}`,
          `Bought: ${purchaseDate}`,
          `Brand warranty ends: ${endDate} (${months} months)`,
          cheapest
            ? `Can still buy an extended warranty: plans from Rs ${cheapest.price_inr}.`
            : `Cannot buy an extended warranty for this device (too old or not in the price list).`,
          `Bill attached: ${savedName}`,
        ].join("\n"),
        attachments: [attachment],
      });
      if (email) {
        const lines = [
          `Hi ${name.split(/\s+/)[0]},`,
          ``,
          `Your bill for your ${device} is now safe in your Warrantys.co Bill Locker. A copy is attached to this email too, so you can always find it in your inbox.`,
          ``,
          `Locker number: ${reference}\nBrand warranty ends: ${formatDate(endDate)}`,
          ``,
          `We will email you a reminder before the warranty ends. To stop reminders, just reply STOP.`,
        ];
        await sendMail({
          to: email,
          bcc: leadUpdatesAddress(),
          replyTo: leadUpdatesAddress(),
          subject: `Your bill is safe: ${device} (${reference})`,
          text: `${lines.join("\n")}\n\nWarrantys.co team`,
          html: brandedHtml(lines),
          attachments: [attachment],
        });
      }
    })().catch((error) => console.error("Bill Locker follow-up failed:", error instanceof Error ? error.message : error));

    return NextResponse.json({ success: true, reference, warrantyEndDate: endDate });
  } catch (error) {
    await reportProblem({
      kind: "form_failed",
      where: "/api/warranty-check/save",
      message: `Bill Locker form crashed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return NextResponse.json({ success: false, message: "Something went wrong. Please try again." }, { status: 400 });
  }
}
