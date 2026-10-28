"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Home" },
  { href: "/admin/problems", label: "Problems & follow-ups" },
  { href: "/admin/warranty", label: "Certificates" },
  { href: "/admin/amazon", label: "Add Amazon order" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              active ? "bg-brand-blue text-white" : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <a
        href="/admin/leads"
        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        Download leads (Excel)
      </a>
    </nav>
  );
}
