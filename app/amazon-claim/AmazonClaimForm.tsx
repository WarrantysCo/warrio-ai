"use client";

import { useState, type FormEvent } from "react";

import { reportFromBrowser } from "@/app/lib/monitoring/reportFromBrowser";

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

function FileField({
  label,
  hint,
  name,
  reading,
  onChange,
}: {
  label: string;
  hint: string;
  name: string;
  reading: boolean;
  onChange: (file: File | null) => void;
}) {
  return (
    <Field label={label} hint={reading ? "Reading your file..." : hint}>
      <input
        type="file"
        name={name}
        accept="application/pdf,image/*"
        required
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-brand-blue"
      />
    </Field>
  );
}

type Detected = {
  categoryId: string;
  priceInr: string;
  brand: string;
  model: string;
  deviceName: string;
  purchaseDate: string;
  amazonOrderId: string;
  warrantyPriceInr: string;
};

const emptyDetected: Detected = {
  categoryId: "",
  priceInr: "",
  brand: "",
  model: "",
  deviceName: "",
  purchaseDate: "",
  amazonOrderId: "",
  warrantyPriceInr: "",
};

export default function AmazonClaimForm({ categories }: { categories: Category[] }) {
  const [detected, setDetected] = useState<Detected>(emptyDetected);
  const [productInvoice, setProductInvoice] = useState<File | null>(null);
  const [warrantyInvoice, setWarrantyInvoice] = useState<File | null>(null);
  const [readingProduct, setReadingProduct] = useState(false);
  const [readingWarranty, setReadingWarranty] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ leadReference: string; email: string } | null>(null);

  function set<K extends keyof Detected>(key: K, value: Detected[K]) {
    setDetected((current) => ({ ...current, [key]: value }));
  }

  async function readInvoice(file: File, kind: "product" | "warranty") {
    const body = new FormData();
    body.set("kind", kind);
    body.set("invoice", file);
    const setReading = kind === "product" ? setReadingProduct : setReadingWarranty;
    setReading(true);
    try {
      const response = await fetch("/api/amazon-claim/extract", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!data?.success) return;
      if (kind === "product") {
        setDetected((current) => ({
          ...current,
          categoryId: data.categoryId || current.categoryId,
          priceInr: data.priceInr ? String(data.priceInr) : current.priceInr,
          brand: data.brand || current.brand,
          model: data.model || current.model,
          deviceName: data.deviceName || current.deviceName,
          purchaseDate: data.date || current.purchaseDate,
        }));
      } else {
        setDetected((current) => ({
          ...current,
          amazonOrderId: data.orderOrInvoiceNumber || current.amazonOrderId,
          warrantyPriceInr: data.priceInr ? String(data.priceInr) : current.warrantyPriceInr,
        }));
      }
    } finally {
      setReading(false);
    }
  }

  function handleProductInvoice(file: File | null) {
    setProductInvoice(file);
    if (file) readInvoice(file, "product");
  }

  function handleWarrantyInvoice(file: File | null) {
    setWarrantyInvoice(file);
    if (file) readInvoice(file, "warranty");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const body = new FormData(event.currentTarget);
    body.set("categoryId", detected.categoryId);
    body.set("priceInr", detected.priceInr);
    body.set("brand", detected.brand);
    body.set("model", detected.model);
    body.set("deviceName", detected.deviceName);
    body.set("purchaseDate", detected.purchaseDate);
    body.set("amazonOrderId", detected.amazonOrderId);
    body.set("warrantyPriceInr", detected.warrantyPriceInr);

    setSending(true);
    try {
      const response = await fetch("/api/amazon-claim", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        // 502-504 come from Hostinger in front of the site, so our own server
        // never saw the request and could not report it itself.
        if (response.status >= 502) {
          reportFromBrowser({
            kind: "form_failed",
            message: `Amazon claim form got error ${response.status}`,
            mobile: String(body.get("mobile") ?? ""),
          });
        }
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }
      setResult({ leadReference: data.leadReference, email: String(body.get("email") ?? "") });
    } catch (error) {
      reportFromBrowser({
        kind: "form_failed",
        message: `Amazon claim form could not reach the server: ${error instanceof Error ? error.message : String(error)}`,
        mobile: String(body.get("mobile") ?? ""),
      });
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
          Our team will check your invoices and email your warranty certificate to{" "}
          <strong>{result.email}</strong>, usually within 2 working days.
        </p>
        <p className="mt-2">Order reference: {result.leadReference}</p>
      </div>
    );
  }

  const category = categories.find((c) => c.id === detected.categoryId);

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input name="fullName" required className={inputClass} />
        </Field>
        <Field label="Mobile number">
          <input name="mobile" required type="tel" inputMode="numeric" className={inputClass} />
        </Field>
        <Field label="Email" hint="We send your certificate here.">
          <input name="email" required type="email" placeholder="you@example.com" className={inputClass} />
        </Field>
        <Field label="Serial number or IMEI" hint="On the sticker at the back of the device, or on the box.">
          <input name="serialNumber" required className={inputClass} />
        </Field>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <div className="text-sm font-bold text-slate-900">Your product&apos;s purchase invoice</div>
        <p className="mt-1 text-xs text-slate-500">
          From Amazon, Flipkart, another store, the manufacturer, or an offline shop — wherever you bought the
          device. We read the brand, model and price from it automatically.
        </p>
        <div className="mt-3">
          <FileField
            label="Upload invoice"
            hint="A clear photo or PDF, up to 10 MB."
            name="productInvoice"
            reading={readingProduct}
            onChange={handleProductInvoice}
          />
        </div>
        {productInvoice && !readingProduct && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Product category">
              <select
                value={detected.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                required
                className={inputClass}
              >
                <option value="" disabled>
                  Choose...
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Device price (Rs)">
              <input
                type="number"
                min={0}
                required
                value={detected.priceInr}
                onChange={(e) => set("priceInr", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Brand">
              <input required value={detected.brand} onChange={(e) => set("brand", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Model">
              <input required value={detected.model} onChange={(e) => set("model", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Device name">
              <input
                required
                value={detected.deviceName}
                onChange={(e) => set("deviceName", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Date you bought the device">
              <input
                type="date"
                required
                value={detected.purchaseDate}
                onChange={(e) => set("purchaseDate", e.target.value)}
                className={`${inputClass} text-slate-700`}
              />
            </Field>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <div className="text-sm font-bold text-slate-900">Your Amazon order for the Warrantys.co plan</div>
        <p className="mt-1 text-xs text-slate-500">
          The Amazon invoice for the extended warranty plan you bought{category ? ` for your ${category.name}` : ""}.
        </p>
        <div className="mt-3">
          <FileField
            label="Upload Amazon order/invoice"
            hint="A clear photo or PDF, up to 10 MB."
            name="warrantyInvoice"
            reading={readingWarranty}
            onChange={handleWarrantyInvoice}
          />
        </div>
        {warrantyInvoice && !readingWarranty && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Amazon Order ID">
              <input
                required
                value={detected.amazonOrderId}
                onChange={(e) => set("amazonOrderId", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Price paid for the plan (Rs)">
              <input
                type="number"
                min={0}
                required
                value={detected.warrantyPriceInr}
                onChange={(e) => set("warrantyPriceInr", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <div className="text-sm font-bold text-slate-900">2 photos of your device</div>
        <p className="mt-1 text-xs text-slate-500">
          Just so we have a record of its condition when the plan starts.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <input
            type="file"
            name="conditionPhoto1"
            accept="image/*"
            required
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-brand-blue"
          />
          <input
            type="file"
            name="conditionPhoto2"
            accept="image/*"
            required
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-brand-blue"
          />
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <button
        type="submit"
        disabled={sending || readingProduct || readingWarranty}
        className="w-full rounded-xl bg-brand-blue py-3 text-base font-bold text-white transition hover:bg-brand-blue-dark disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send my details"}
      </button>
    </form>
  );
}
