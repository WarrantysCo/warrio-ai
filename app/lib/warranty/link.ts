import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// Each order gets a personal "complete your warranty" link. Lead references
// are short and easy to guess, so the link also carries a code made from a
// server secret; only someone we sent the link to can open the form.

function secret() {
  return (
    process.env.WARRANTY_LINK_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.ADMIN_PASSWORD ||
    ""
  );
}

export function siteUrl() {
  return (process.env.SITE_URL || "https://warrantys.co").replace(/\/+$/, "");
}

export function warrantyToken(leadReference: string) {
  const key = secret();
  if (!key) return "";
  return createHmac("sha256", key)
    .update(`warranty:${leadReference}`)
    .digest("base64url")
    .slice(0, 22);
}

export function isValidWarrantyToken(leadReference: string, token: string) {
  const expected = warrantyToken(leadReference);
  if (!expected || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function warrantyLink(leadReference: string) {
  // The code is part of the path, not "?t=", because Razorpay adds its own
  // "?razorpay_..." to the end of the callback link.
  return `${siteUrl()}/warranty/${encodeURIComponent(leadReference)}/${warrantyToken(leadReference)}`;
}
