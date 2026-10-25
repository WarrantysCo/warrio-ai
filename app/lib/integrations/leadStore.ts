import "server-only";

import { appendFile, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { LeadRow } from "./n8n";

// Keeps every website lead on the server itself, one JSON line per lead, so
// nothing depends on n8n or a laptop being on. The default lives in the home
// folder, not the app folder, because Hostinger replaces the app folder on
// every deploy and a lead saved there was lost. LEADS_FILE overrides it.

export type StoredLead = LeadRow & { payment_link: string };

function leadsFile() {
  return (
    process.env.LEADS_FILE ||
    path.join(/*turbopackIgnore: true*/ os.homedir(), "warrio-data", "leads.jsonl")
  );
}

export async function saveLead(lead: StoredLead): Promise<boolean> {
  try {
    const file = leadsFile();
    await mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
    await appendFile(/*turbopackIgnore: true*/ file, `${JSON.stringify(lead)}\n`, "utf8");
    return true;
  } catch (error) {
    console.error(
      "Saving lead failed:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

export async function readLeads(): Promise<StoredLead[]> {
  let text: string;
  try {
    text = await readFile(/*turbopackIgnore: true*/ leadsFile(), "utf8");
  } catch {
    return [];
  }
  return text
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as StoredLead];
      } catch {
        return [];
      }
    });
}
