import "server-only";

import { createHash } from "node:crypto";

// Turns an Amazon order ID into a stable lead reference, so a customer who
// submits the same order twice (or an automated tool that retries) updates
// the same lead instead of creating a duplicate.
export function amazonLeadReference(amazonOrderId: string) {
  const digits = amazonOrderId.replace(/\D/g, "").slice(-6);
  if (digits.length === 6) return `WAR-AMZ-${digits}`;
  const hash = createHash("sha256").update(amazonOrderId.trim().toLowerCase()).digest("hex");
  return `WAR-AMZ-${hash.slice(0, 6).toUpperCase()}`;
}
