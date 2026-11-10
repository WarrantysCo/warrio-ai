// Date maths for the Free Warranty Check. Plain code (no server-only) so the
// page and the server always agree on the same answer.

const DAY_MS = 24 * 60 * 60 * 1000;

export const WARRANTY_MONTH_CHOICES = [6, 12, 24, 36, 60] as const;
export const DEFAULT_WARRANTY_MONTHS = 12;

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

// The brand warranty runs up to the day before the same date N months later.
export function warrantyEndDate(purchaseDate: string, months: number): string | null {
  if (!isIsoDate(purchaseDate)) return null;
  const date = new Date(`${purchaseDate}T00:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return new Date(date.getTime() - DAY_MS).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number) {
  return new Date(new Date(`${isoDate}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

// Whole days from today until the date (negative when it has passed).
export function daysUntil(isoDate: string, now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((new Date(`${isoDate}T00:00:00Z`).getTime() - today) / DAY_MS);
}

export function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
