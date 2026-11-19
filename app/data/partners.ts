// Partner programme rules, in one place so the public page, the emails and
// the admin page always say the same thing. Amit approved 10% on 2026-11-19.

export const PARTNER_COMMISSION_PERCENT = 10;

// Commission is only due once the customer's 7-day refund window has passed.
export const PARTNER_REFUND_WINDOW_DAYS = 7;

export const PARTNER_BUSINESS_TYPES = [
  "Electronics or appliance shop",
  "Online seller",
  "Repair or installation technician",
  "Property, interior or society services",
  "Content creator or deal website",
  "Finance, EMI or checkout platform",
  "Other",
] as const;

export const PARTNER_VOLUME_CHOICES = [
  "Fewer than 20 devices a month",
  "20 to 100 devices a month",
  "100 to 500 devices a month",
  "More than 500 devices a month",
] as const;

// GSTIN: 2-digit state code, PAN, entity number, Z, check character.
export const GST_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;
