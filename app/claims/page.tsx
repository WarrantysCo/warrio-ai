import type { Metadata } from "next";

import PageShell from "@/app/components/PageShell";
import { contact } from "@/app/data/contact";

export const metadata: Metadata = {
  title: "Raise a Claim",
  description:
    "Device stopped working? How to raise a service request on your Warrantys.co extended warranty.",
};

// Steps and timelines from the Warrantys.co FAQ (questions 9, 10 and 19).
const steps = [
  {
    title: "Tell us what happened",
    text: "WhatsApp, call or email us with your name, your device and what is wrong. Your plan details are already with us, so you don't need to find the bill again.",
  },
  {
    title: "We send an expert",
    text: "We give your request to an authorised service partner. They attend to it within 72 hours: at home for big appliances, or by pickup or at a service centre for small devices.",
  },
  {
    title: "Your device is fixed",
    text: "Most repairs are done within 15 days (30 days in rare cases). Parts and visits are 100% cashless. You sign a service report at the end.",
  },
  {
    title: "Can't be fixed? We replace or refund",
    text: "If your device can't be repaired, you get an equal replacement or a full refund of the purchase value, with no depreciation cut.",
  },
];

export default function ClaimsPage() {
  return (
    <PageShell
      eyebrow="Raise a Claim"
      title="Device stopped working?"
      intro="Raise a service request any time. There are no extra charges for visits or parts."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <a
          href={contact.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl bg-emerald-600 px-5 py-4 text-center font-bold hover:bg-emerald-500 text-white"
        >
          WhatsApp us
        </a>
        <a
          href={contact.phoneHref}
          className="rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 text-center font-bold hover:bg-slate-100"
        >
          Call {contact.phone}
        </a>
        <a
          href={`mailto:${contact.email}?subject=Service%20request`}
          className="rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 text-center font-bold hover:bg-slate-100"
        >
          Email us
        </a>
      </div>

      <ol className="mt-12 space-y-4">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-5 rounded-3xl border border-slate-200 bg-white p-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue font-bold text-white">
              {index + 1}
            </span>
            <div>
              <h2 className="text-lg font-bold">{step.title}</h2>
              <p className="mt-2 leading-7 text-slate-600">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-sm leading-6 text-slate-500">
        Not covered: physical or liquid damage, theft, cosmetic damage,
        accessories, and problems the maker&apos;s warranty doesn&apos;t cover.
        See the FAQ for the full list.
      </p>
    </PageShell>
  );
}
