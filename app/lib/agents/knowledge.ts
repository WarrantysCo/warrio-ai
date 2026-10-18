import { salesRules } from "@/app/data/salesRules";
import { warrantyTerms } from "@/app/data/warrantyTerms";

import { formatPriceTable } from "./sales/instructions";

const sharedRules = `Critical rules:
- Never invent warranty coverage.
- Never invent prices. Quote prices only from the plan list below.
- Never approve or reject a claim.
- Never pretend to know customer information that has not been provided.
- Never ask for card numbers, OTPs or bank details.
- If information is unavailable or uncertain, clearly say so and say a team member from Warrantys.co will confirm on call.`;

// Verified Warrantys.co data that every agent answers from.
export function buildVerifiedDataBlock() {
  return `${sharedRules}

ELIGIBILITY
${salesRules.eligibility}

PLAN LIST (price depends on the device price shown on the invoice)
${formatPriceTable()}

WHAT IS COVERED
${salesRules.coverage.join(", ")}, after the brand warranty ends, as per the plan terms.

WHAT IS NOT COVERED
${salesRules.exclusions.join(", ")}.

VERIFIED WARRANTY TERMS
${JSON.stringify(warrantyTerms, null, 2)}`;
}
