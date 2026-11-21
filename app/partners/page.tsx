import type { Metadata } from "next";

import PageShell from "@/app/components/PageShell";
import { PARTNER_COMMISSION_PERCENT, PARTNER_REFUND_WINDOW_DAYS } from "@/app/data/partners";

import PartnerForm from "./PartnerForm";

export const metadata: Metadata = {
  title: "Become a Partner | Warrantys.co",
  description:
    "Shops, online sellers and technicians can offer Warrantys.co extended warranty plans to their customers and earn a commission on every paid plan.",
};

const steps = [
  { icon: "📝", title: "Register your business", text: "Fill in the short form below with your business details." },
  { icon: "✅", title: "We check and approve", text: "We verify your details and send you your own link and QR code." },
  { icon: "📲", title: "Share your link or QR", text: "Show it at your counter or send it to buyers of devices up to 9 months old." },
  { icon: "💰", title: "Earn on every paid plan", text: `You earn ${PARTNER_COMMISSION_PERCENT}% of the plan price, paid monthly.` },
];

export default function PartnersPage() {
  return (
    <PageShell
      eyebrow="Partner programme"
      title="Offer extended warranty. Earn on every plan."
      intro="If your customers buy phones, TVs, ACs, fridges or other devices from you, you can offer them Warrantys.co extended warranty and earn a commission, with no stock and no paperwork on your side."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-3xl" aria-hidden>
              {step.icon}
            </div>
            <div className="mt-2 font-bold text-slate-900">{step.title}</div>
            <p className="mt-1 text-sm text-slate-600">{step.text}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-2xl">
        <h2 className="text-2xl font-black text-slate-900">Partner registration</h2>
        <p className="mt-1 text-sm text-slate-600">
          We ask for business details so we only work with real, registered businesses. Your details are used only for
          this programme.
        </p>
        <div className="mt-5">
          <PartnerForm />
        </div>

        <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
          <div className="font-bold text-slate-900">How commission works</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              You earn {PARTNER_COMMISSION_PERCENT}% of the plan price on each order that comes through your link or QR
              code and is paid for.
            </li>
            <li>
              Commission becomes payable after the customer&apos;s {PARTNER_REFUND_WINDOW_DAYS}-day refund window ends,
              and is not paid on refunded orders.
            </li>
            <li>Payments are made once a month by bank transfer or UPI, after we collect your bank details on approval.</li>
            <li>Plans are for devices up to 9 months from the purchase date. Applicable taxes may be deducted as per law.</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
