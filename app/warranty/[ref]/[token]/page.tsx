import type { Metadata } from "next";

import PageShell from "@/app/components/PageShell";
import { readLeads } from "@/app/lib/integrations/leadStore";
import { isPaidCallback, type PaymentCallback } from "@/app/lib/integrations/razorpay";
import { isValidWarrantyToken } from "@/app/lib/warranty/link";
import { readWarrantyStatus, saveWarrantyRecord } from "@/app/lib/warranty/store";

import WarrantyForm from "./WarrantyForm";

// The personal page where a paid customer sends what the certificate needs.
// Razorpay brings the customer here after paying; we also send the same link
// to anyone who closed the page early.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Complete your warranty | Warrantys.co",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WarrantyPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string; token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ref, token } = await params;
  const leadReference = decodeURIComponent(ref);
  const leads = isValidWarrantyToken(leadReference, token)
    ? await readLeads()
    : [];
  const lead = leads.findLast((row) => row.lead_reference === leadReference);

  if (!lead) {
    return (
      <PageShell eyebrow="Warrantys.co" title="This link is not working">
        <p className="max-w-2xl text-lg leading-8 text-slate-700">
          Please open the link exactly as we sent it to you. If it still does
          not open, reply to our message with your order reference and we will
          help you.
        </p>
      </PageShell>
    );
  }

  const query = await searchParams;
  const callback: PaymentCallback = {
    razorpay_payment_id: first(query.razorpay_payment_id),
    razorpay_payment_link_id: first(query.razorpay_payment_link_id),
    razorpay_payment_link_reference_id: first(query.razorpay_payment_link_reference_id),
    razorpay_payment_link_status: first(query.razorpay_payment_link_status),
    razorpay_signature: first(query.razorpay_signature),
  };

  let status = await readWarrantyStatus(leadReference);
  if (
    isPaidCallback(callback, leadReference) &&
    status.payment?.payment_id !== callback.razorpay_payment_id
  ) {
    await saveWarrantyRecord({
      type: "payment",
      date: new Date().toISOString(),
      lead_reference: leadReference,
      payment_id: callback.razorpay_payment_id ?? "",
      payment_link_id: callback.razorpay_payment_link_id ?? "",
    });
    status = await readWarrantyStatus(leadReference);
  }

  const saved = status.details;

  return (
    <PageShell
      eyebrow={status.payment ? "Payment received" : "Your Warrantys.co plan"}
      title="Complete your warranty"
      intro={
        <>
          {status.payment ? "Thank you for your payment. " : ""}
          Just a few details about your device, and we will email your
          warranty certificate to you.
        </>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <WarrantyForm
          leadReference={leadReference}
          token={token}
          hasInvoice={Boolean(saved?.invoice_file)}
          submitted={Boolean(saved)}
          initial={{
            fullName: saved?.name ?? lead.name,
            mobile: saved?.mobile ?? lead.mobile,
            email: saved?.email ?? lead.email,
            deviceName: saved?.device_name ?? "",
            brand: saved?.brand ?? lead.brand,
            model: saved?.model ?? lead.model,
            serialNumber: saved?.serial_or_imei ?? lead.serial_or_imei,
            purchaseDate:
              saved?.device_purchase_date ??
              (/^\d{4}-\d{2}-\d{2}$/.test(lead.invoice_date ?? "") ? lead.invoice_date ?? "" : ""),
          }}
        />

        <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
          <div className="text-base font-bold text-slate-900">Your plan</div>
          <div className="mt-2">{lead.recommended_plan}</div>
          <div>For your {lead.product_category}</div>
          <div>Plan price: ₹{lead.plan_price_inr.toLocaleString("en-IN")}</div>
          <div className="mt-2 text-slate-500">Order reference: {leadReference}</div>
        </aside>
      </div>
    </PageShell>
  );
}
