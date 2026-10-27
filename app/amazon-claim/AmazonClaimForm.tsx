"use client";

import { useState, type FormEvent } from "react";

type Category = { id: string; name: string; icon: string };

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export default function AmazonClaimForm({
  categories,
  initial,
}: {
  categories: Category[];
  initial: {
    amazonOrderId: string;
    categoryId: string;
    priceInr: string;
    tenureYears: string;
    fullName: string;
  };
}) {
  const [invoice, setInvoice] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ leadReference: string; email: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const body = new FormData(event.currentTarget);
    if (invoice) body.set("invoice", invoice);

    setSending(true);
    try {
      const response = await fetch("/api/amazon-claim", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }
      setResult({ leadReference: data.leadReference, email: String(body.get("email") ?? "") });
    } catch {
      setError("We could not reach our server. Please check your internet and try again.");
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-50 p-6 text-sm leading-6 text-emerald-900">
        <div className="text-lg font-bold">Thank you, we have your details.</div>
        <p className="mt-2">
          Our team will check your bill and email your warranty certificate to{" "}
          <strong>{result.email}</strong>, usually within 2 working days.
        </p>
        <p className="mt-2">Order reference: {result.leadReference}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amazon Order ID" hint="Found in Your Orders on Amazon, e.g. 408-9233882-7965122.">
          <input name="amazonOrderId" required defaultValue={initial.amazonOrderId} className={inputClass} />
        </Field>
        <Field label="Full name">
          <input name="fullName" required defaultValue={initial.fullName} className={inputClass} />
        </Field>
        <Field label="Mobile number">
          <input name="mobile" required type="tel" inputMode="numeric" className={inputClass} />
        </Field>
        <Field label="Email" hint="We send your certificate here.">
          <input name="email" required type="email" placeholder="you@example.com" className={inputClass} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Product category">
          <select name="categoryId" required defaultValue={initial.categoryId} className={inputClass}>
            <option value="" disabled>
              Choose...
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Device price (Rs)" hint="The price shown for your plan on Amazon.">
          <input name="priceInr" required type="number" min={0} defaultValue={initial.priceInr} className={inputClass} />
        </Field>
        <Field label="Plan length">
          <select name="tenureYears" required defaultValue={initial.tenureYears || "1"} className={inputClass}>
            <option value="1">1 year</option>
            <option value="2">2 years</option>
            <option value="3">3 years</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand">
          <input name="brand" required placeholder="e.g. Samsung" className={inputClass} />
        </Field>
        <Field label="Model">
          <input name="model" required placeholder="e.g. UA43T5450" className={inputClass} />
        </Field>
        <Field label="Device name" hint="As written on the box or bill.">
          <input name="deviceName" required className={inputClass} />
        </Field>
        <Field label="Serial number or IMEI">
          <input name="serialNumber" required className={inputClass} />
        </Field>
        <Field label="Date you bought the device">
          <input name="purchaseDate" required type="date" className={`${inputClass} text-slate-700`} />
        </Field>
      </div>

      <Field label="Amazon invoice" hint="A clear photo or PDF of your Amazon invoice, up to 10 MB.">
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => setInvoice(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-brand-blue"
        />
      </Field>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-xl bg-brand-blue py-3 text-base font-bold text-white transition hover:bg-brand-blue-dark disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send my details"}
      </button>
    </form>
  );
}
