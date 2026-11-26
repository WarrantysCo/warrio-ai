// Tells our server that something went wrong on the customer's screen, so it
// shows up on /admin/problems and in Amit's alert email. Safe to call from
// anywhere in the browser: it never throws and never slows the page down.

type BrowserProblem = {
  kind: "page_crash" | "browser_error" | "form_failed";
  message: string;
  leadReference?: string;
  mobile?: string;
};

// A broken page can fire the same error in a loop; a few reports are enough.
let sent = 0;
const MAX_PER_PAGE_LOAD = 5;

export function reportFromBrowser(problem: BrowserProblem) {
  if (typeof window === "undefined" || sent >= MAX_PER_PAGE_LOAD) return;
  sent += 1;
  try {
    const body = JSON.stringify({
      ...problem,
      message: problem.message.slice(0, 500),
      where: window.location.pathname,
    });
    // sendBeacon still goes out if the customer is leaving the page.
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/problems", blob)) return;
    void fetch("/api/problems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting is best-effort.
  }
}
