// Business rules the sales agent applies after reading an invoice. Prices live
// in priceList.ts; everything here is policy that can change without touching
// the price sheet.
// Plan must be bought within this many months of the invoice date. Carried
// over from the V1 Television data; confirm with the business before launch.
const PURCHASE_WINDOW_MONTHS = 9;

export const salesRules = {
  country: "India",

  purchaseWindowMonths: PURCHASE_WINDOW_MONTHS,

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

  eligibility: `New products bought in India, with the plan bought within ${PURCHASE_WINDOW_MONTHS} months of the invoice date.`,
};
