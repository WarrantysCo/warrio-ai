"use client";

import Link from "next/link";
import { useEffect } from "react";

import { isChunkLoadError, reloadForChunkError } from "@/app/lib/monitoring/chunkReload";
import { reportFromBrowser } from "@/app/lib/monitoring/reportFromBrowser";

// Shown instead of a blank screen when a page breaks. The problem is reported
// so the team can follow up even if the customer just leaves.
export default function PageError({
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
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-6 py-20 text-center text-slate-900">
      <h1 className="text-2xl font-black">Sorry, something went wrong</h1>
      <p className="mt-3 text-slate-600">
        Our team has been told about it automatically. Please try again, or
        contact us and we will help you finish.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-xl bg-brand-blue px-5 py-3 font-bold text-white hover:bg-brand-blue-dark"
        >
          Try again
        </button>
        <Link
          href="/contact"
          className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-800 hover:bg-slate-50"
        >
          Contact us
        </Link>
      </div>
    </main>
  );
}
