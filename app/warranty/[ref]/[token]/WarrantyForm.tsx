"use client";

import { useState, type FormEvent } from "react";

import { reportFromBrowser } from "@/app/lib/monitoring/reportFromBrowser";

type Details = {
  fullName: string;
  mobile: string;
  email: string;
  deviceName: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export default function WarrantyForm({
  leadReference,
  token,
  initial,
  hasInvoice,
  submitted,
}: {
  leadReference: string;
  token: string;
  initial: Details;
  hasInvoice: boolean;
  submitted: boolean;
}) {
  const [details, setDetails] = useState(initial);
  const [invoice, setInvoice] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(submitted);
  const [editing, setEditing] = useState(!submitted);

  const update = (key: keyof Details, value: string) =>
    setDetails((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!invoice && !hasInvoice) {
      setError("Please add a photo or PDF of your purchase bill.");
      return;
    }
    if (!confirmed) {
      setError("Please confirm that these details are correct.");
      return;
    }

    const body = new FormData();
    body.set("leadReference", leadReference);
    body.set("token", token);
    for (const [key, value] of Object.entries(details)) body.set(key, value);
    if (invoice) body.set("invoice", invoice);

    setSending(true);
    try {
      const response = await fetch("/api/warranty", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        // 502-504 come from Hostinger in front of the site, so our own server
        // never saw the request and could not report it itself.
        if (response.status >= 502) {
          reportFromBrowser({
            kind: "form_failed",
            message: `Warranty details form got error ${response.status}`,
            leadReference,
            mobile: details.mobile,
          });
        }
        setError(result.message || "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
      setEditing(false);
    } catch (error) {
      reportFromBrowser({
        kind: "form_failed",
        message: `Warranty details form could not reach the server: ${error instanceof Error ? error.message : String(error)}`,
        leadReference,
        mobile: details.mobile,
      });
      setError("We could not reach our server. Please check your internet and try again.");
    } finally {
      setSending(false);
    }
  }

  if (done && !editing) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-50 p-6 text-sm leading-6 text-emerald-900">
        <div className="text-lg font-bold">Thank you, we have your details.</div>
        <p className="mt-2">
          Our team will check your bill and email your warranty certificate to{" "}
          <strong>{details.email}</strong>, usually within 2 working days.
        </p>
        <p className="mt-2">
          Device: {[details.brand, details.model].filter(Boolean).join(" ")}
          {details.serialNumber ? ` · Serial/IMEI ${details.serialNumber}` : ""}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-4 font-semibold text-brand-blue hover:text-brand-blue-dark"
        >
          Need to change something? Edit details
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input required value={details.fullName} onChange={(e) => update("fullName", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Mobile number">
          <input required type="tel" inputMode="numeric" value={details.mobile} onChange={(e) => update("mobile", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Email" hint="We send your certificate here.">
          <input required type="email" placeholder="you@example.com" value={details.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Device name" hint="As written on the box or bill, e.g. Aquaguard Sure Delight.">
          <input required value={details.deviceName} onChange={(e) => update("deviceName", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Brand">
          <input required placeholder="e.g. Samsung" value={details.brand} onChange={(e) => update("brand", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Model">
          <input required placeholder="e.g. UA43T5450" value={details.model} onChange={(e) => update("model", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Serial number or IMEI" hint="On the sticker at the back of the device, or on the box.">
          <input required value={details.serialNumber} onChange={(e) => update("serialNumber", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Date you bought the device">
          <input required type="date" value={details.purchaseDate} onChange={(e) => update("purchaseDate", e.target.value)} className={`${inputClass} text-slate-700`} />
        </Field>
      </div>

      <Field
        label="Purchase bill"
        hint={
          hasInvoice
            ? "We already have your bill. Add a new one only if you want to replace it."
            : "A clear photo or PDF of the bill, up to 10 MB."
        }
      >
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => setInvoice(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-brand-blue"
        />
      </Field>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
        <span>These details are correct and match my purchase bill.</span>
      </label>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

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
