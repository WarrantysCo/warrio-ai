"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Home" },
  { href: "/admin/warranty", label: "Certificates" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/outreach", label: "Outreach" },
  { href: "/admin/chats", label: "Chats" },
  { href: "/admin/problems", label: "Problems" },
  { href: "/admin/amazon", label: "Amazon order" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1">
      {LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              active ? "bg-brand-blue text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <a
        href="/admin/leads"
        className="ml-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
      >
        Leads (Excel)
      </a>
    </nav>
  );
}
