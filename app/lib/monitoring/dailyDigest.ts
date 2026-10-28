import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { leadsFile } from "@/app/lib/integrations/leadStore";
import { sendAlertEmail } from "@/app/lib/warranty/email";

import { readProblems } from "./problems";
import { findStuckCustomers, STUCK_LABELS } from "./stuck";

// Once a day, at 9 am India time, emails Amit the customers who are stuck and
// how many problems the site had in the last 24 hours. Started from
// instrumentation.ts when the server starts. The date of the last email is
// kept on disk so a restart does not send a second one the same day.

const SEND_HOUR_IST = 9;

function sentFile() {
  return path.join(/*turbopackIgnore: true*/ path.dirname(leadsFile()), "daily-digest-sent.txt");
}

function todayInIndia(now: Date) {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function hourInIndia(now: Date) {
  return Number(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false })) % 24;
}

export async function sendDailyDigestIfDue(now = new Date()) {
  if (process.env.ALERT_EMAILS === "off") return;
  if (hourInIndia(now) < SEND_HOUR_IST) return;
  const today = todayInIndia(now);
  const lastSent = await readFile(/*turbopackIgnore: true*/ sentFile(), "utf8").catch(() => "");
  if (lastSent.trim() === today) return;
  // Mark first, so two checks running together do not both send.
  await writeFile(/*turbopackIgnore: true*/ sentFile(), today, "utf8").catch(() => {});

  const [stuck, problems] = await Promise.all([findStuckCustomers(now.getTime()), readProblems()]);
  const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  const recentProblems = problems.filter((problem) => new Date(problem.date).getTime() >= dayAgo);
  if (stuck.length === 0 && recentProblems.length === 0) return;

  const site = (process.env.SITE_URL || "https://warrantys.co").replace(/\/+$/, "");
  const lines = [`Hi Amit,`, ``, `Here is today's check of warrantys.co.`, ``];
  lines.push(
    recentProblems.length > 0
      ? `Problems in the last 24 hours: ${recentProblems.length}. See ${site}/admin/problems`
      : `No website problems in the last 24 hours.`,
    ``
  );
  if (stuck.length > 0) {
    lines.push(`Customers who need a follow-up: ${stuck.length}`, ``);
    for (const reason of Object.keys(STUCK_LABELS) as (keyof typeof STUCK_LABELS)[]) {
      const group = stuck.filter((row) => row.reason === reason);
      if (group.length === 0) continue;
      lines.push(`${STUCK_LABELS[reason].title} (${group.length}):`);
      for (const row of group.slice(0, 20)) {
        lines.push(
          `- ${row.lead.name || "No name"}, ${row.lead.mobile || "no mobile"}, ${row.lead.lead_reference}, waiting ${row.hoursWaiting}h`
        );
      }
      if (group.length > 20) lines.push(`- and ${group.length - 20} more`);
      lines.push(``);
    }
    lines.push(`Full list with phone numbers and form links: ${site}/admin/problems`);
  }

  await sendAlertEmail({
    to: process.env.ALERT_EMAIL || "business@warrantys.co",
    subject: `Warrantys.co daily check: ${stuck.length} customer(s) to follow up, ${recentProblems.length} problem(s)`,
    text: lines.join("\n"),
  });
}
