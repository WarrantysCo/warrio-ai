// Plan pricing and eligibility. This is plain code on purpose: the AI only reads
// the invoice and writes the reply, while prices and eligibility always come
// from here so Warrio can never invent a price.

import { priceCategories } from "@/app/data/priceList";
import type { PriceBand, PriceCategory } from "@/app/data/catalogTypes";
import { salesRules } from "@/app/data/salesRules";

import type { InvoiceDetails, PlanQuote, SalesDecision } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function getCategory(categoryId: string) {
  return priceCategories.find((category) => category.id === categoryId) ?? null;
}

export function getCategoryByName(name: string | null | undefined) {
  if (!name) return null;
  const wanted = name.trim().toLowerCase();
  return (
    priceCategories.find(
      (category) =>
        category.name.toLowerCase() === wanted || category.id === wanted
    ) ?? null
  );
}

// The first band includes its lower limit; later bands start just above the
// previous band's upper limit.
function findBand(category: PriceCategory, priceInr: number) {
  return (
    category.bands.find(([minInr, maxInr], index) =>
      index === 0
        ? priceInr >= minInr && priceInr <= maxInr
        : priceInr > minInr && priceInr <= maxInr
    ) ?? null
  );
}

function quotesForBand(category: PriceCategory, band: PriceBand): PlanQuote[] {
  const [minInr, maxInr, ...prices] = band;

  return prices.flatMap((price, index) => {
    if (price === null) return [];
    const tenureYears = index + 1;

    return [
      {
        id: `${category.id}_${minInr}-${maxInr}_${tenureYears}y`,
        category_id: category.id,
        category_name: category.name,
        tenure_years: tenureYears,
        label: `${tenureYears}-year plan`,
        plan_name: `${category.shortName} ${tenureYears}-year plan`,
        price_inr: price,
      },
    ];
  });
}

export function quotePlans(categoryId: string, priceInr: number): PlanQuote[] {
  const category = getCategory(categoryId);
  if (!category) return [];
  const band = findBand(category, priceInr);
  return band ? quotesForBand(category, band) : [];
}

export function findPlanQuote(planId: string) {
  for (const category of priceCategories) {
    for (const band of category.bands) {
      const quote = quotesForBand(category, band).find(
        (plan) => plan.id === planId
      );
      if (quote) return quote;
    }
  }
  return null;
}

export function lowestPrice(category: PriceCategory) {
  return Math.min(
    ...category.bands.flatMap(([, , ...prices]) =>
      prices.filter((price): price is number => price !== null)
    )
  );
}

export function daysSincePurchase(invoiceDate: string | null, now = new Date()) {
  if (!invoiceDate || !/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) return null;
  const purchased = new Date(`${invoiceDate}T00:00:00Z`);
  if (Number.isNaN(purchased.getTime())) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - purchased.getTime()) / DAY_MS);
}

export function isWithinPurchaseWindow(invoiceDate: string, now = new Date()) {
  const days = daysSincePurchase(invoiceDate, now);
  return days !== null && days >= 0 && days <= salesRules.purchaseWindowDays;
}

function formatRupees(amount: number) {
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

export function decideSale(invoice: InvoiceDetails, now = new Date()): SalesDecision {
  const teamNotes: string[] = [];
  const category = getCategory(invoice.product_category);
  const days = daysSincePurchase(invoice.invoice_date, now);
  const options =
    category && invoice.price_inr !== null
      ? quotePlans(category.id, invoice.price_inr)
      : [];

  const cannotConfirm = (message: string): SalesDecision => {
    teamNotes.push(message);
    return {
      eligibility_status: "cannot_confirm",
      eligibility_message: message,
      days_since_purchase: days,
      recommended_plan_id: null,
      recommended_plan: null,
      plan_price_inr: null,
      plan_options: [],
      team_notes: teamNotes,
    };
  };

  const ineligible = (message: string): SalesDecision => ({
    ...cannotConfirm(message),
    eligibility_status: "ineligible",
  });

  if (!category) {
    return cannotConfirm("Product is not in the Warrio price list. Team to check.");
  }
  if (invoice.price_inr === null) {
    return cannotConfirm("Device price could not be read from the invoice.");
  }
  if (options.length === 0) {
    return cannotConfirm(
      `No ${category.name} plan in the price list for a device of ${formatRupees(invoice.price_inr)}.`
    );
  }
  if (days === null) {
    return cannotConfirm("Invoice date could not be read.");
  }
  if (days < 0) {
    return cannotConfirm("Invoice date is in the future. Invoice may be wrong.");
  }
  if (!isWithinPurchaseWindow(invoice.invoice_date!, now)) {
    return ineligible(
      `Bought ${days} days ago, outside the ${salesRules.purchaseWindowDays}-day plan window.`
    );
  }
  if (
    invoice.purchase_country &&
    invoice.purchase_country.trim().toLowerCase() !== salesRules.country.toLowerCase()
  ) {
    return ineligible(`Invoice shows a purchase in ${invoice.purchase_country}, not India.`);
  }

  const sorted = [...options].sort((a, b) => a.tenure_years - b.tenure_years);
  const recommended =
    salesRules.recommend === "longest" ? sorted[sorted.length - 1] : sorted[0];

  return {
    eligibility_status: "eligible",
    eligibility_message: `Eligible for a ${category.name} plan.`,
    days_since_purchase: days,
    recommended_plan_id: recommended.id,
    recommended_plan: recommended.plan_name,
    plan_price_inr: recommended.price_inr,
    plan_options: sorted,
    team_notes: teamNotes,
  };
}
