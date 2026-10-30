import type { Instrumentation } from "next";

// Runs once when the website starts on Hostinger: checks every 30 minutes
// whether the 9 am daily email to Amit is due (see dailyDigest.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { sendDailyDigestIfDue } = await import("@/app/lib/monitoring/dailyDigest");
  const check = () =>
    sendDailyDigestIfDue().catch((error) =>
      console.error("Daily digest failed:", error instanceof Error ? error.message : error)
    );
  setInterval(check, 30 * 60 * 1000).unref();
  void check();
}

// Any error our own code did not catch (a page or API that crashed) is saved
// to /admin/problems and emailed to Amit, like the ones we do catch.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportProblem } = await import("@/app/lib/monitoring/problems");
  const message = error instanceof Error ? error.message : String(error);
  const digest =
    typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : "";
  await reportProblem({
    kind: "server_crash",
    where: `${request.method} ${request.path.split("?")[0]}`,
    message: `${message}${digest ? ` (code ${digest})` : ""} [${context.routeType}]`,
  });
};
