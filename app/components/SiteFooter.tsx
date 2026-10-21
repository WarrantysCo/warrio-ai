import Link from "next/link";

import { contact } from "@/app/data/contact";

import { BrandLogo } from "./SiteHeader";

const columns = [
  {
    title: "Warranty",
    links: [
      { href: "/plans", label: "Plans & Prices" },
      { href: "/#how", label: "How It Works" },
      { href: "/claims", label: "Raise a Claim" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact Us" },
    ],
  },
  {
    title: "Policies",
    links: [
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/refund-policy", label: "Refund & Cancellation" },
      { href: "/shipping-policy", label: "Delivery Policy" },
      { href: "/privacy-policy", label: "Privacy Policy" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-4">
        <div>
          <BrandLogo />
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Extended warranty plans for your phones, TVs, laptops and home
            appliances. 100% cashless repairs.
          </p>
          <address className="mt-4 text-xs not-italic leading-5 text-slate-500">
            {contact.address.join(", ")}
          </address>
          <div className="mt-4 space-y-1 text-sm text-slate-700">
            <a href={`mailto:${contact.email}`} className="block hover:text-brand-blue">
              {contact.email}
            </a>
            <a href={contact.phoneHref} className="block hover:text-brand-blue">
              Call / WhatsApp: {contact.phone}
            </a>
          </div>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <div className="text-sm font-semibold text-slate-900">{column.title}</div>
            <ul className="mt-4 space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-slate-600 hover:text-brand-blue">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>
            © {new Date().getFullYear()} {contact.brand} · {contact.company}
          </div>
          <div>Powered by Warrio AI</div>
        </div>
      </div>
    </footer>
  );
}
