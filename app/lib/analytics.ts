// Sends a named event to Google Analytics when it is loaded (see GoogleAnalytics.tsx).
// Never pass names, mobile numbers or emails here, only things like price and a reference.
type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

export function trackEvent(name: string, params: Record<string, string | number> = {}) {
  try {
    (window as GtagWindow).gtag?.("event", name, params);
  } catch {
    // Tracking must never break the page.
  }
}
