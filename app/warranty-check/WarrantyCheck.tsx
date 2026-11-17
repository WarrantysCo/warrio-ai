"use client";

import { useRef, useState, type FormEvent } from "react";

import { salesRules } from "@/app/data/salesRules";
import { trackEvent } from "@/app/lib/analytics";
import { isWithinPurchaseWindow, quotePlans } from "@/app/lib/agents/sales/pricing";
import type { PlanQuote } from "@/app/lib/agents/sales/types";
import {
  addDays,
  daysUntil,
  DEFAULT_WARRANTY_MONTHS,
  formatDate,
  isIsoDate,
  WARRANTY_MONTH_CHOICES,
  warrantyEndDate,
} from "@/app/lib/locker/dates";
import { reportFromBrowser } from "@/app/lib/monitoring/reportFromBrowser";

type Category = { id: string; name: string; icon: string };

type Details = {
  deviceName: string;
  brand: string;
  model: string;
  categoryId: string;
  priceInr: string;
  purchaseDate: string;
};

const emptyDetails: Details = {
  deviceName: "",
  brand: "",
  model: "",
  categoryId: "",
  priceInr: "",
  purchaseDate: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base outline-none placeholder:text-slate-400 focus:border-blue-500";
const cardClass = "rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-7";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const monthsLabel = (months: number) => (months < 12 ? `${months} months` : `${months / 12} year${months > 12 ? "s" : ""}`);

export default function WarrantyCheck({ categories }: { categories: Category[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState("");
  const [details, setDetails] = useState<Details>(emptyDetails);
  const [months, setMonths] = useState<number>(DEFAULT_WARRANTY_MONTHS);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ reference: string; name: string; mobile: string; email: string } | null>(null);
  const [buying, setBuying] = useState("");
  const [buyError, setBuyError] = useState("");

  function set<K extends keyof Details>(key: K, value: Details[K]) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  async function handleFile(picked: File | null) {
    if (!picked) return;
    setFile(picked);
    setSaved(null);
    setError("");
    setReadNote("");
    setDetails(emptyDetails);
    setEditing(false);
    setReading(true);
    trackEvent("warranty_check_upload");
    try {
      const body = new FormData();
      body.set("invoice", picked);
      const response = await fetch("/api/warranty-check/read", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (data?.success && data.isInvoice !== false) {
        setDetails({
          deviceName: data.deviceName || [data.brand, data.model].filter(Boolean).join(" "),
          brand: data.brand || "",
          model: data.model || "",
          categoryId: data.categoryId || "",
          priceInr: data.priceInr ? String(data.priceInr) : "",
          purchaseDate: data.date && isIsoDate(data.date) ? data.date : "",
        });
        if (!data.date) {
          setReadNote("We could not read the date on your bill. Please enter it below.");
          setEditing(true);
        }
      } else {
        setReadNote(
          data?.message || "We could not read this bill clearly. Please enter the purchase date below."
        );
        setEditing(true);
      }
    } catch {
      setReadNote("We could not read this bill just now. Please enter the purchase date below.");
      setEditing(true);
    } finally {
      setReading(false);
    }
  }

  const priceInr = Number(details.priceInr);
  const endDate = details.purchaseDate ? warrantyEndDate(details.purchaseDate, months) : null;
  const daysLeft = endDate ? daysUntil(endDate) : null;
  const totalDays = endDate && details.purchaseDate ? Math.max(daysUntil(endDate) - daysUntil(details.purchaseDate), 1) : 1;
  const usedPercent = daysLeft === null ? 0 : Math.min(100, Math.max(0, Math.round(((totalDays - daysLeft) / totalDays) * 100)));
  const canBuy = details.purchaseDate !== "" && isWithinPurchaseWindow(details.purchaseDate);
  const plans: PlanQuote[] =
    canBuy && details.categoryId && priceInr > 0 ? quotePlans(details.categoryId, priceInr) : [];
  const lowestPlan = plans.length > 0 ? Math.min(...plans.map((plan) => plan.price_inr)) : null;
  const buyBy = details.purchaseDate && canBuy ? addDays(details.purchaseDate, salesRules.purchaseWindowDays) : null;
  const device = details.deviceName || [details.brand, details.model].filter(Boolean).join(" ") || "your device";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !endDate) return;
    setError("");
    const body = new FormData(event.currentTarget);
    body.set("invoice", file);
    body.set("deviceName", details.deviceName);
    body.set("brand", details.brand);
    body.set("model", details.model);
    body.set("categoryId", details.categoryId);
    body.set("priceInr", details.priceInr);
    body.set("purchaseDate", details.purchaseDate);
    body.set("warrantyMonths", String(months));
    body.set("consent", body.get("consent") === "on" ? "true" : "false");
    const mobile = String(body.get("mobile") ?? "");
    setSaving(true);
    try {
      const response = await fetch("/api/warranty-check/save", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        if (response.status >= 502) {
          reportFromBrowser({ kind: "form_failed", message: `Bill Locker form got error ${response.status}`, mobile });
        }
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }
      trackEvent("bill_locker_saved", { can_buy: plans.length > 0 ? 1 : 0 });
      setSaved({
        reference: data.reference,
        name: String(body.get("fullName") ?? ""),
        mobile,
        email: String(body.get("email") ?? ""),
      });
    } catch (caught) {
      reportFromBrowser({
        kind: "form_failed",
        message: `Bill Locker form could not reach the server: ${caught instanceof Error ? caught.message : String(caught)}`,
        mobile,
      });
      setError("We could not reach our server. Please check your internet and try again.");
    } finally {
      setSaving(false);
    }
  }

  // Orders the chosen plan through the same order route as the home page, so
  // price and eligibility are checked again on the server.
  async function buy(plan: PlanQuote) {
    if (!saved || !file) return;
    setBuyError("");
    setBuying(plan.id);
    trackEvent("bill_locker_plan_click", { price: plan.price_inr });
    try {
      const body = new FormData();
      body.set("selectedPlanId", plan.id);
      body.set("priceInr", details.priceInr);
      body.set("purchaseDate", details.purchaseDate);
      body.set("brand", details.brand || details.deviceName);
      body.set("model", details.model || details.deviceName);
      body.set("fullName", saved.name);
      body.set("mobile", saved.mobile);
      body.set("email", saved.email);
      body.set("consent", "true");
      body.set("question", `Came from the Free Bill Locker (${saved.reference}).`);
      body.set("invoice", file);
      const response = await fetch("/api/leads", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (data?.success && data.paymentUrl) {
        window.location.assign(data.paymentUrl);
        return;
      }
      setBuyError(
        data?.success
          ? "Your order is saved. Our team will send you the payment link shortly."
          : data?.message || "Something went wrong. Please try again."
      );
    } catch {
      setBuyError("We could not reach our server. Please check your internet and try again.");
    } finally {
      setBuying("");
    }
  }

  const uploadBox = (
    <div className={cardClass}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={reading}
        className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand-blue/50 bg-blue-50/60 px-4 py-10 text-center transition hover:bg-blue-50 disabled:opacity-70"
      >
        <span className="text-5xl" aria-hidden>
          {reading ? "⏳" : "🧾"}
        </span>
        <span className="text-xl font-black text-slate-900">
          {reading ? "Reading your bill…" : file ? "Check another bill" : "Upload your bill"}
        </span>
        <span className="text-sm text-slate-600">
          {reading ? "This takes a few seconds." : "Take a photo or choose a PDF. Free, no payment needed."}
        </span>
      </button>
      {!file && (
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-700 sm:text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-2xl">📅</div>See your warranty end date
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-2xl">🔒</div>Bill kept safe, free
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-2xl">⏰</div>Reminder before it ends
          </div>
        </div>
      )}
    </div>
  );

  if (!file || reading) return <div className="mx-auto max-w-2xl">{uploadBox}</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className={cardClass}>
        {readNote && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{readNote}</div>
        )}

        {endDate && daysLeft !== null ? (
          <>
            <div className="text-sm font-semibold uppercase tracking-wider text-brand-blue">{device}</div>
            <div className="mt-2 text-sm text-slate-600">
              {daysLeft >= 0 ? "Your brand warranty ends on" : "Your brand warranty ended on"}
            </div>
            <div className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{formatDate(endDate)}</div>
            <div
              className={`mt-3 inline-block rounded-full px-4 py-1.5 text-sm font-bold ${
                daysLeft < 0
                  ? "bg-red-100 text-red-800"
                  : daysLeft <= 60
                    ? "bg-amber-100 text-amber-900"
                    : "bg-emerald-100 text-emerald-900"
              }`}
            >
              {daysLeft < 0 ? "Warranty is over" : daysLeft === 0 ? "Last day today" : `${daysLeft} days left`}
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${daysLeft < 0 ? "bg-red-400" : daysLeft <= 60 ? "bg-amber-400" : "bg-brand-green-dark"}`}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>Bought {formatDate(details.purchaseDate)}</span>
              <span>{monthsLabel(months)} warranty</span>
            </div>
          </>
        ) : (
          <div className="text-lg font-bold text-slate-900">Enter the date you bought the device</div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="Brand warranty length" hint="Most brands give 1 year. Change it if your bill or warranty card says different.">
            <select value={months} onChange={(event) => setMonths(Number(event.target.value))} className={inputClass}>
              {WARRANTY_MONTH_CHOICES.map((choice) => (
                <option key={choice} value={choice}>
                  {monthsLabel(choice)}
                </option>
              ))}
            </select>
          </Field>
          {(editing || !endDate) && (
            <>
              <Field label="Date you bought it">
                <input
                  type="date"
                  value={details.purchaseDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => set("purchaseDate", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Device">
                <input
                  value={details.deviceName}
                  placeholder="e.g. Samsung 43 inch TV"
                  onChange={(event) => set("deviceName", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Type of device">
                <select value={details.categoryId} onChange={(event) => set("categoryId", event.target.value)} className={inputClass}>
                  <option value="">Other / not sure</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Price you paid (Rs)">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={details.priceInr}
                  onChange={(event) => set("priceInr", event.target.value)}
                  className={inputClass}
                />
              </Field>
            </>
          )}
        </div>
        {!editing && endDate && (
          <button type="button" onClick={() => setEditing(true)} className="mt-3 text-sm font-semibold text-brand-blue">
            Something wrong? Fix the details
          </button>
        )}
      </div>

      {endDate && !saved && (
        <form onSubmit={save} className={cardClass}>
          <div className="text-xl font-black text-slate-900">🔒 Keep this bill safe, free</div>
          <p className="mt-1 text-sm text-slate-600">
            Bills fade and get lost. We keep yours safe and remind you before the warranty ends.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Your name">
              <input name="fullName" required autoComplete="name" className={inputClass} />
            </Field>
            <Field label="Mobile number">
              <input
                name="mobile"
                required
                type="tel"
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                placeholder="10-digit number"
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Email (for your reminder)" hint="We email a copy of the bill and the reminder here.">
                <input name="email" type="email" autoComplete="email" placeholder="you@example.com" className={inputClass} />
              </Field>
            </div>
          </div>
          <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" name="consent" required className="mt-1 h-4 w-4" />
            <span>
              Save my bill and send me warranty reminders and plan offers from Warrantys.co. See our{" "}
              <a href="/privacy-policy" className="font-semibold text-brand-blue">
                privacy policy
              </a>
              .
            </span>
          </label>
          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          <button
            type="submit"
            disabled={saving}
            className="mt-5 w-full rounded-xl bg-brand-blue py-3.5 text-base font-bold text-white transition hover:bg-brand-blue-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save my bill & remind me"}
          </button>
          {lowestPlan !== null && buyBy && (
            <p className="mt-3 text-center text-sm text-slate-600">
              Good news: this device can get extended warranty from{" "}
              <strong className="text-slate-900">Rs {lowestPlan.toLocaleString("en-IN")}</strong>, until {formatDate(buyBy)}.
            </p>
          )}
        </form>
      )}

      {saved && (
        <div className="rounded-3xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 sm:p-7">
          <div className="text-xl font-black">✅ Your bill is safe</div>
          <p className="mt-2 text-sm leading-6">
            Locker number <strong>{saved.reference}</strong>.{" "}
            {saved.email
              ? `We have emailed a copy to ${saved.email} and will remind you before the warranty ends.`
              : "We have saved it against your mobile number."}
          </p>
        </div>
      )}

      {saved && plans.length > 0 && buyBy && (
        <div className={cardClass}>
          <div className="text-xl font-black text-slate-900">🛡️ Keep {device} covered after the brand warranty</div>
          <p className="mt-1 text-sm text-slate-600">
            Extended warranty can only be added in the first 9 months after buying. For this device that is until{" "}
            <strong>{formatDate(buyBy)}</strong>. Repair at home, genuine parts, and a replacement or full refund if it
            cannot be repaired.
          </p>
          <div className="mt-4 space-y-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                disabled={buying !== ""}
                onClick={() => buy(plan)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-brand-blue/30 bg-white px-4 py-4 text-left transition hover:border-brand-blue disabled:opacity-60"
              >
                <span>
                  <span className="block text-base font-bold text-slate-900">
                    {plan.tenure_years} extra year{plan.tenure_years > 1 ? "s" : ""} of cover
                  </span>
                  <span className="block text-sm text-slate-600">Rs {plan.price_inr.toLocaleString("en-IN")}, pay once</span>
                </span>
                <span className="shrink-0 rounded-full bg-brand-blue px-4 py-2 text-sm font-bold text-white">
                  {buying === plan.id ? "Opening…" : "Protect it"}
                </span>
              </button>
            ))}
          </div>
          {buyError && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{buyError}</div>}
          <p className="mt-3 text-xs text-slate-500">7-day full refund if you change your mind.</p>
        </div>
      )}

      {saved && plans.length === 0 && details.purchaseDate && !canBuy && (
        <div className={`${cardClass} text-sm text-slate-700`}>
          Extended warranty can only be added in the first 9 months after buying, so this device cannot be covered now.
          Bought something new recently? Check that bill too and see if it can still be protected.
        </div>
      )}

      {uploadBox}
    </div>
  );
}
