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
    <Link href="/" className="flex items-center gap-3">
      <span className="text-2xl font-black tracking-tight">
        <span className="text-lime-400">W</span>
        <span className="text-sky-400">arrantys</span>
        <span className="ml-0.5 rounded-full bg-lime-400 px-1.5 py-0.5 align-super text-[10px] font-bold text-slate-950">
          co
        </span>
      </span>
      <span className="hidden text-xs text-slate-400 sm:block">
        Device&apos;s extra care
      </span>
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
    "shrink-0 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500";

  return (
    <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
        <BrandLogo />

        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-slate-300 hover:text-white"
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

      <nav className="flex gap-5 overflow-x-auto border-t border-white/5 px-6 py-3 lg:hidden">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 text-sm text-slate-300 hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
