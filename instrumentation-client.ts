import { isChunkLoadError, reloadForChunkError } from "@/app/lib/monitoring/chunkReload";
import { reportFromBrowser } from "@/app/lib/monitoring/reportFromBrowser";

// Catches errors on any page of the site that nothing else handled (a button
// that throws, a script that breaks on an old phone) and reports them.

function isNoise(message: string) {
  // "Script error." comes from other sites' scripts and browser extensions and
  // carries no detail; ResizeObserver warnings are harmless. window.ethereum
  // is injected by crypto-wallet extensions (MetaMask etc.) into every site a
  // visitor opens, nothing to do with our pages, and a buggy extension's own
  // error still shows up as if it came from here.
  return (
    !message ||
    message === "Script error." ||
    message.includes("ResizeObserver loop") ||
    message.includes("chrome-extension://") ||
    message.includes("moz-extension://") ||
    message.includes("window.ethereum") ||
    message.includes("ethereum.selectedAddress")
  );
}

window.addEventListener("error", (event) => {
  const message = event.error instanceof Error ? event.error.message : event.message;
  // A chunk from a page click (not caught by a React error boundary) fails
  // the same way after a deploy: reload to fetch the current build.
  if (isChunkLoadError(event.error ?? { message }) && reloadForChunkError()) return;
  if (isNoise(message ?? "")) return;
  reportFromBrowser({ kind: "browser_error", message: message ?? "" });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? "");
  if (isChunkLoadError(reason instanceof Error ? reason : { message }) && reloadForChunkError()) return;
  if (isNoise(message)) return;
  reportFromBrowser({ kind: "browser_error", message });
});
