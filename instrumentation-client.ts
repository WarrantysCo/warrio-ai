import { reportFromBrowser } from "@/app/lib/monitoring/reportFromBrowser";

// Catches errors on any page of the site that nothing else handled (a button
// that throws, a script that breaks on an old phone) and reports them.

function isNoise(message: string) {
  // "Script error." comes from other sites' scripts and browser extensions and
  // carries no detail; ResizeObserver warnings are harmless.
  return (
    !message ||
    message === "Script error." ||
    message.includes("ResizeObserver loop") ||
    message.includes("chrome-extension://") ||
    message.includes("moz-extension://")
  );
}

window.addEventListener("error", (event) => {
  const message = event.error instanceof Error ? event.error.message : event.message;
  if (isNoise(message ?? "")) return;
  reportFromBrowser({ kind: "browser_error", message: message ?? "" });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? "");
  if (isNoise(message)) return;
  reportFromBrowser({ kind: "browser_error", message });
});
