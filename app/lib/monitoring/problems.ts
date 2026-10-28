import "server-only";

import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { leadsFile } from "@/app/lib/integrations/leadStore";
import { sendAlertEmail } from "@/app/lib/warranty/email";

// Every time a customer hits an error (on our server or in their browser) it
// is saved here and shown on /admin/problems, and Amit gets an email. Before
// this, errors only went to the Hostinger server log, which nobody reads, so
// a stuck customer simply left without anyone knowing (Amit, 2026-10-28).

export type ProblemKind =
  | "server_crash"
  | "page_crash"
  | "browser_error"
  | "form_failed"
  | "payment_link"
  | "payment_failed"
  | "saving_failed"
  | "certificate_email"
  | "warrio_ai"
  | "hubspot";

export type ProblemRecord = {
  date: string;
  kind: ProblemKind;
  // The page or API path the customer was on.
  where: string;
  message: string;
  lead_reference?: string;
  mobile?: string;
  source: "server" | "browser";
};

// What each kind means in Amit's words, for the admin page and the email.
export const PROBLEM_LABELS: Record<ProblemKind, string> = {
  server_crash: "Website error on our server",
  page_crash: "Page crashed on the customer's phone",
  browser_error: "Error in the customer's browser",
  form_failed: "Customer could not send a form",
  payment_link: "Could not make the payment link",
  payment_failed: "Customer's payment failed",
  saving_failed: "Could not save customer's details",
  certificate_email: "Certificate email failed",
  warrio_ai: "Warrio AI could not answer or read the bill",
  hubspot: "Could not save to HubSpot",
};

// One email per kind of problem per half hour, so a breakdown hitting 1000
// customers sends one email, not 1000. The page still lists every one.
const ALERT_GAP_MS = 30 * 60 * 1000;
const lastAlertAt = new Map<ProblemKind, number>();
const suppressedSince = new Map<ProblemKind, number>();

function problemsFile() {
  return path.join(/*turbopackIgnore: true*/ path.dirname(leadsFile()), "problems.jsonl");
}

function alertEmailTo() {
  return process.env.ALERT_EMAIL || "business@warrantys.co";
}

function clip(value: string | undefined, max: number) {
  return value ? value.replace(/\s+/g, " ").trim().slice(0, max) : undefined;
}

// Never throws: reporting a problem must not cause a second one.
export async function reportProblem(
  problem: Omit<ProblemRecord, "date" | "source"> & { source?: ProblemRecord["source"] }
) {
  const record: ProblemRecord = {
    date: new Date().toISOString(),
    kind: problem.kind,
    where: clip(problem.where, 200) ?? "",
    message: clip(problem.message, 500) ?? "",
    lead_reference: clip(problem.lead_reference, 40),
    mobile: clip(problem.mobile, 20),
    source: problem.source ?? "server",
  };
  console.error(`Problem [${record.kind}] ${record.where}: ${record.message}`);

  try {
    await mkdir(/*turbopackIgnore: true*/ path.dirname(problemsFile()), { recursive: true });
    await appendFile(/*turbopackIgnore: true*/ problemsFile(), `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    console.error("Saving problem failed:", error instanceof Error ? error.message : error);
  }

  // Not awaited: the customer's request should not wait for Gmail.
  void alert(record);
}

async function alert(record: ProblemRecord) {
  if (process.env.ALERT_EMAILS === "off") return;
  const now = Date.now();
  const last = lastAlertAt.get(record.kind) ?? 0;
  if (now - last < ALERT_GAP_MS) {
    suppressedSince.set(record.kind, (suppressedSince.get(record.kind) ?? 0) + 1);
    return;
  }
  // Set before sending, so problems arriving while this email is on its way
  // do not each send their own.
  lastAlertAt.set(record.kind, now);
  const repeats = suppressedSince.get(record.kind) ?? 0;
  suppressedSince.delete(record.kind);

  const label = PROBLEM_LABELS[record.kind];
  const lines = [
    `Hi Amit,`,
    ``,
    `A customer hit a problem on warrantys.co.`,
    ``,
    `What happened: ${label}`,
    `Where: ${record.where || "unknown page"}`,
    `Details: ${record.message || "none"}`,
    record.lead_reference ? `Order reference: ${record.lead_reference}` : null,
    record.mobile ? `Customer mobile: ${record.mobile}` : null,
    `Time: ${new Date(record.date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    repeats > 0 ? `This also happened ${repeats} more time(s) since the last alert email.` : null,
    ``,
    `See every problem here: ${(process.env.SITE_URL || "https://warrantys.co").replace(/\/+$/, "")}/admin/problems`,
    ``,
    `You will get at most one email like this every 30 minutes for the same kind of problem.`,
  ].filter((line) => line !== null);
  await sendAlertEmail({
    to: alertEmailTo(),
    subject: `Warrantys.co alert: ${label}`,
    text: lines.join("\n"),
  });
}

// Newest first. Only the last `limit` are read back, so the page stays fast
// even if the file grows large.
export async function readProblems(limit = 500): Promise<ProblemRecord[]> {
  let text: string;
  try {
    text = await readFile(/*turbopackIgnore: true*/ problemsFile(), "utf8");
  } catch {
    return [];
  }
  return text
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as ProblemRecord];
      } catch {
        return [];
      }
    })
    .reverse();
}
