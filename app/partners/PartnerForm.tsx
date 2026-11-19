"use client";

import { useState, type FormEvent } from "react";

import { PARTNER_BUSINESS_TYPES, PARTNER_COMMISSION_PERCENT, PARTNER_VOLUME_CHOICES } from "@/app/data/partners";
import { trackEvent } from "@/app/lib/analytics";
import { reportFromBrowser } from "@/app/lib/monitoring/reportFromBrowser";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base outline-none placeholder:text-slate-400 focus:border-blue-500";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export default function PartnerForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/partners/register", { method: "POST", body: new FormData(event.currentTarget) });
      const data = (await response.json().catch(() => null)) as { success?: boolean; message?: string } | null;
      if (!response.ok || !data?.success) {
        setError(data?.message || "Something went wrong. Please try again.");
        // A 400 is only a refused detail (wrong PAN, mobile...) and the visitor sees why: not a site problem.
        if (response.status >= 500) reportFromBrowser({ kind: "form_failed", message: `Partner form got error ${response.status}` });
        return;
      }
      trackEvent("partner_apply");
      setDone(true);
    } catch (caught) {
      setError("Could not send the form. Please check your internet and try again.");
      reportFromBrowser({ kind: "form_failed", message: `Partner form network error: ${caught instanceof Error ? caught.message : "unknown"}` });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="text-4xl" aria-hidden>
          🎉
        </div>
        <div className="mt-2 text-xl font-black text-slate-900">Thank you, we have your details</div>
        <p className="mt-2 text-sm text-slate-700">
          We will check your business details and email you your partner link and QR code once you are approved. A
          confirmation has been sent to your email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business or shop name">
          <input name="businessName" required maxLength={120} className={inputClass} autoComplete="organization" />
        </Field>
        <Field label="Owner / contact person">
          <input name="ownerName" required maxLength={120} className={inputClass} autoComplete="name" />
        </Field>
        <Field label="Mobile number">
          <input name="mobile" required inputMode="numeric" maxLength={10} placeholder="10-digit number" className={inputClass} autoComplete="tel-national" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" required className={inputClass} autoComplete="email" />
        </Field>
        <Field label="Type of business">
          <select name="businessType" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choose one
            </option>
            {PARTNER_BUSINESS_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field label="City">
          <input name="city" required maxLength={80} className={inputClass} />
        </Field>
      </div>
      <Field label="Shop or business address">
        <input name="address" required maxLength={250} className={inputClass} />
      </Field>
      <Field label="Website, store or Instagram link (optional)">
        <input name="website" maxLength={200} placeholder="https://" className={inputClass} />
      </Field>

      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="text-sm font-bold text-slate-900">Business registration</div>
        <p className="mt-1 text-xs text-slate-600">
          Everything here is optional. If you have a GST number or a registration (Udyam, Shop &amp; Establishment, company
          certificate), please share it: it helps us approve you faster.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="GST number (optional)">
            <input name="gst" maxLength={15} placeholder="15 characters" className={`${inputClass} uppercase`} />
          </Field>
          <Field label="PAN (optional)" hint="We will need it before paying commission">
            <input name="pan" maxLength={10} placeholder="ABCDE1234F" className={`${inputClass} uppercase`} />
          </Field>
          <Field label="Udyam / registration number (optional)">
            <input name="registrationNo" maxLength={40} className={inputClass} />
          </Field>
          <Field label="Registration proof, photo or PDF (optional)">
            <input name="proof" type="file" accept="image/*,.pdf" className="w-full text-sm" />
          </Field>
        </div>
      </div>

      <Field label="Roughly how many devices do you sell in a month?">
        <select name="devicesPerMonth" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Choose one
          </option>
          {PARTNER_VOLUME_CHOICES.map((choice) => (
            <option key={choice}>{choice}</option>
          ))}
        </select>
      </Field>

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" name="consent" value="true" required className="mt-1 h-5 w-5" />
        <span>
          I confirm the details above are correct, and I agree to the partner terms: {PARTNER_COMMISSION_PERCENT}% of
          the plan price on paid, non-refunded orders, paid monthly after the refund window. I will not promise
          customers anything beyond our published plan terms.
        </span>
      </label>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</div>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-brand-blue py-3.5 text-base font-bold text-white transition hover:bg-brand-blue-dark disabled:opacity-60"
      >
        {busy ? "Sending..." : "Register as a partner"}
      </button>
    </form>
  );
}
