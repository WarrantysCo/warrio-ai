import type { Metadata } from "next";
import Link from "next/link";

import PageShell from "@/app/components/PageShell";
import { priceCategories } from "@/app/data/priceList";
import { salesRules } from "@/app/data/salesRules";
import { lowestPrice } from "@/app/lib/agents/sales/pricing";

export const metadata: Metadata = {
  title: "Plans & Prices",
  description:
    "Extended warranty prices for phones, TVs, laptops, ACs, fridges and more, by device price and plan length.",
};

const rupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;

function bandLabel(minInr: number, maxInr: number, isFirst: boolean) {
  return isFirst && minInr === 0
    ? `Up to ${rupees(maxInr)}`
    : `${rupees(minInr)} – ${rupees(maxInr)}`;
}

export default function PlansPage() {
  return (
    <PageShell
      eyebrow="Plans & Prices"
      title="Find your plan price"
      intro={
        <>
          Pick your device, then find the price you paid for it. That row shows
          what a 1, 2 or 3-year extended warranty costs. Not sure?{" "}
          <Link href="/#ask" className="font-semibold text-blue-400 hover:text-blue-300">
            Upload your bill to Warrio
          </Link>{" "}
          and it picks the right plan for you.
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.06] p-6">
          <div className="font-bold text-emerald-300">What is covered</div>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
            {salesRules.coverage.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
            <li>✓ Genuine spare parts and repair visits, 100% cashless</li>
          </ul>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="font-bold">Not covered</div>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-400">
            {salesRules.exclusions.map((item) => (
              <li key={item}>✕ {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-4 text-sm leading-6 text-slate-300">
        <span className="font-semibold text-blue-300">Who can buy: </span>
        {salesRules.eligibility}
      </p>

      <div className="mt-10 space-y-3">
        {priceCategories.map((category) => (
          <details
            key={category.id}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] open:bg-white/[0.05]"
          >
            <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4">
              <span className="text-3xl">{category.icon}</span>
              <span className="flex-1">
                <span className="block font-bold">{category.name}</span>
                <span className="text-sm text-slate-400">
                  From {rupees(lowestPrice(category))}
                </span>
              </span>
              <span className="text-slate-500 transition group-open:rotate-90">
                ›
              </span>
            </summary>

            <div className="overflow-x-auto px-5 pb-5">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-slate-400">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4 font-medium">Price you paid</th>
                    <th className="py-2 pr-4 font-medium">1 year</th>
                    <th className="py-2 pr-4 font-medium">2 years</th>
                    <th className="py-2 font-medium">3 years</th>
                  </tr>
                </thead>
                <tbody>
                  {category.bands.map(([minInr, maxInr, ...prices], index) => (
                    <tr key={`${minInr}-${maxInr}`} className="border-b border-white/5">
                      <td className="py-2 pr-4 text-slate-300">
                        {bandLabel(minInr, maxInr, index === 0)}
                      </td>
                      {prices.map((price, tenure) => (
                        <td
                          key={tenure}
                          className={
                            price === null
                              ? "py-2 pr-4 text-slate-600"
                              : "py-2 pr-4 font-semibold"
                          }
                        >
                          {price === null ? "—" : rupees(price)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-3xl border border-blue-500/20 bg-blue-600/10 p-8 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold">Let Warrio pick for you</h2>
          <p className="mt-2 text-slate-400">
            Upload a photo or PDF of your bill. Warrio reads it and shows your
            plan and price in a few seconds.
          </p>
        </div>
        <Link
          href="/#ask"
          className="shrink-0 rounded-2xl bg-blue-600 px-7 py-4 font-bold hover:bg-blue-500"
        >
          Upload my bill →
        </Link>
      </div>
    </PageShell>
  );
}
