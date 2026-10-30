"use client";

import { useEffect } from "react";

import { isChunkLoadError, reloadForChunkError } from "@/app/lib/monitoring/chunkReload";
import { reportFromBrowser } from "@/app/lib/monitoring/reportFromBrowser";

// Last resort when even the site's frame fails to load. It cannot use the
// site's styles, so it keeps to plain inline ones.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // After a deploy, a visitor's already-open tab can ask for a JS file
    // from the old build and fail. A reload fetches the current build and
    // just works, so do that instead of showing an error screen.
    if (isChunkLoadError(error) && reloadForChunkError()) return;

    reportFromBrowser({
      kind: "page_crash",
      message: error.digest ? `${error.message} (server code ${error.digest})` : error.message,
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "80px 24px", color: "#0f172a" }}>
        <title>Something went wrong | Warrantys.co</title>
        <h1 style={{ fontSize: 24 }}>Sorry, something went wrong</h1>
        <p style={{ color: "#475569" }}>
          Our team has been told about it automatically. Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{ marginTop: 16, padding: "12px 20px", borderRadius: 12, border: 0, background: "#1e8be8", color: "#fff", fontWeight: 700 }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
