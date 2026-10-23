"use client";

import { useRef, useState } from "react";

import { priceCategories } from "@/app/data/priceList";
import { quotePlans } from "@/app/lib/agents/sales/pricing";

type Tab = "upload" | "price";

// The home page's two quick ways in: upload a bill for Warrio to read, or
// look up the price yourself. Buying always goes through the bill upload,
// because Warrio needs the invoice to check eligibility.
export default function GetPlanBox({
  onInvoice,
  onSelectProduct,
}: {
  onInvoice: (file: File | null) => void;
  onSelectProduct: (productName: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("upload");
  const [categoryId, setCategoryId] = useState("");
  const [priceText, setPriceText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const priceInr = Number(priceText.replace(/[^\d]/g, ""));
  const category = priceCategories.find((entry) => entry.id === categoryId);
  const quotes = category && priceInr > 0 ? quotePlans(category.id, priceInr) : [];

  const tabClass = (active: boolean) =>
    `flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${
      active ? "bg-white text-brand-blue shadow" : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200">
      <div className="text-lg font-black">Get your plan in 1 minute</div>

      <div className="mt-4 flex gap-1 rounded-2xl bg-slate-100 p-1">
        <button type="button" onClick={() => setTab("upload")} className={tabClass(tab === "upload")}>
          📎 Upload your bill
        </button>
        <button type="button" onClick={() => setTab("price")} className={tabClass(tab === "price")}>
          🔍 Find my price
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(event) => {
          onInvoice(event.target.files?.[0] || null);
          event.target.value = "";
        }}
      />

      {tab === "upload" ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-blue/40 bg-blue-50 px-6 py-8 text-center transition hover:border-brand-blue hover:bg-blue-100"
          >
            <span className="text-4xl">🧾</span>
            <span className="text-lg font-bold text-brand-blue">
              Upload a photo or PDF of your bill
            </span>
            <span className="text-sm text-slate-600">
              Warrio reads it and shows your plan and price in seconds
            </span>
          </button>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
            <li>✅ No typing: Warrio fills in your details</li>
            <li>✅ Exact price for your device</li>
            <li>✅ Pay securely and you&apos;re covered</li>
          </ul>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            Your device
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base font-normal outline-none focus:border-brand-blue"
            >
              <option value="">Choose your device</option>
              {priceCategories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.icon} {entry.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Price you paid (₹)
            <input
              inputMode="numeric"
              placeholder="e.g. 45000"
              value={priceText}
              onChange={(event) => setPriceText(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base font-normal outline-none placeholder:text-slate-400 focus:border-brand-blue"
            />
          </label>

          {category && priceInr > 0 && (
            <div className="rounded-2xl bg-slate-50 p-4">
              {quotes.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {quotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-center"
                      >
                        <div className="text-xs text-slate-600">{quote.label}</div>
                        <div className="mt-1 text-lg font-black text-brand-blue">
                          ₹{quote.price_inr.toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProduct(category.name);
                      fileInputRef.current?.click();
                    }}
                    className="mt-3 w-full rounded-xl bg-brand-blue py-3 font-bold text-white transition hover:bg-brand-blue-dark"
                  >
                    Buy now: upload your bill →
                  </button>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    We need your bill to check your device and start the plan.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-700">
                  We don&apos;t have a ready price for this amount. Upload your
                  bill and Warrio will check it for you.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
