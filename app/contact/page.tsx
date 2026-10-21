import type { Metadata } from "next";
import Link from "next/link";

import PageShell from "@/app/components/PageShell";
import { contact } from "@/app/data/contact";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Email, call or WhatsApp the Warrantys.co team.",
};

export default function ContactPage() {
  const cards = [
    {
      title: "WhatsApp",
      value: contact.phone,
      href: contact.whatsappHref,
      external: true,
    },
    { title: "Call", value: contact.phone, href: contact.phoneHref },
    { title: "Email", value: contact.email, href: `mailto:${contact.email}` },
  ];

  return (
    <PageShell
      eyebrow="Contact Us"
      title="We're here to help"
      intro={
        <>
          For the quickest answer about plans and prices,{" "}
          <Link href="/#ask" className="font-semibold text-blue-400 hover:text-blue-300">
            ask Warrio
          </Link>
          . For anything else, reach our team below.
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <a
            key={card.title}
            href={card.href}
            {...(card.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-blue-500/40 hover:bg-blue-500/[0.08]"
          >
            <div className="text-sm text-slate-400">{card.title}</div>
            <div className="mt-2 break-words text-lg font-bold">{card.value}</div>
          </a>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-slate-300">
        <div className="font-bold text-white">{contact.company}</div>
        <address className="mt-2 text-sm not-italic leading-6 text-slate-400">
          {contact.address.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </address>
        <div className="mt-3 text-sm text-slate-400">
          {contact.brand} is a brand of {contact.company}.
        </div>
      </div>
    </PageShell>
  );
}
