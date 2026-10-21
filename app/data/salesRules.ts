// Business rules the sales agent applies after reading an invoice. Prices live
// in priceList.ts; everything here is policy that can change without touching
// the price sheet.

// Plan must be bought within this many days of the invoice date (website FAQ).
const PURCHASE_WINDOW_DAYS = 270;

export const salesRules = {
  country: "India",

  purchaseWindowDays: PURCHASE_WINDOW_DAYS,

  // Which plan Warrio recommends when several tenures are sold for a band.
  recommend: "longest" as "longest" | "shortest",

  coverage: [
    "Manufacturing defects",
    "Electrical and mechanical breakdowns",
    "Software issues",
  ],

  exclusions: [
    "Physical damage",
    "Liquid damage",
    "Theft or loss",
    "Cosmetic damage",
    "Accessories and consumables (filters, batteries, cables)",
    "AC gas",
  ],

  eligibility: `New (not refurbished) products bought in India with an invoice and manufacturer's warranty, with the plan bought within ${PURCHASE_WINDOW_DAYS} days of the invoice date.`,
};
