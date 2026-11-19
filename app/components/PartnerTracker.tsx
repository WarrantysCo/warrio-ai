"use client";

import { useEffect } from "react";

import { trackEvent } from "@/app/lib/analytics";

// When a visitor arrives from a partner's link or QR code (?partner=CODE),
// remember it for 30 days so the order they place later is credited to that
// partner. Only the code is stored, no personal details.
export default function PartnerTracker() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = (params.get("partner") || params.get("ref") || "").toUpperCase();
      if (!/^[A-Z0-9]{4,12}$/.test(code)) return;
      document.cookie = `warrio_partner=${code}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax`;
      trackEvent("partner_visit");
    } catch {
      // Tracking must never break the page.
    }
  }, []);
  return null;
}
