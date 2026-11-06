import Image from "next/image";
import Link from "next/link";

const navLinks = [
  { href: "/plans", label: "Plans & Prices" },
  { href: "/#how", label: "How It Works" },
  { href: "/claims", label: "Raise a Claim" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function BrandLogo() {
  return (
    <Link href="/" aria-label="Warrantys.co home" className="shrink-0">
      <Image
        src="/brand/warrantys-logo.png"
        alt="Warrantys.co: Device's extra care"
        width={900}
        height={260}
        priority
        className="h-12 w-auto sm:h-14"
      />
    </Link>
  );
}

// On the home page the "Ask Warrio" button opens the chat in place; every
// other page links to the home page with #ask, which opens it there.
export default function SiteHeader({
  onAskWarrio,
}: {
  onAskWarrio?: () => void;
}) {
  const buttonClass =
    "shrink-0 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold shadow-lg shadow-brand-blue/20 transition hover:bg-brand-blue-dark text-white";

  return (
    <header className="border-t-4 border-b border-t-brand-green border-b-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <BrandLogo />

        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-slate-700 hover:text-brand-blue"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {onAskWarrio ? (
          <button type="button" onClick={onAskWarrio} className={buttonClass}>
            Ask Warrio
          </button>
        ) : (
          <Link href="/#ask" className={buttonClass}>
            Ask Warrio
          </Link>
        )}
      </div>

      <nav className="flex gap-5 overflow-x-auto border-t border-slate-100 px-6 py-3 lg:hidden">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 text-sm text-slate-700 hover:text-brand-blue"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
