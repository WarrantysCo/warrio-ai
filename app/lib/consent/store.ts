import "server-only";

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { CONTACT_CONSENT_TEXT, CONTACT_CONSENT_VERSION } from "@/app/data/consent";
import { leadsFile } from "@/app/lib/integrations/leadStore";

// One line per time a person ticked "you may contact me", kept next to the
// leads so we can show who agreed, when, where, and to which wording.
export async function saveContactConsent(options: {
  source: string;
  reference?: string;
  name?: string;
  mobile?: string;
  email?: string;
}) {
  try {
    const dir = path.dirname(/*turbopackIgnore: true*/ leadsFile());
    await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
    await appendFile(
      /*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ dir, "contact-consent.jsonl"),
      `${JSON.stringify({
        date: new Date().toISOString(),
        ...options,
        channels: ["sms", "rcs", "email", "whatsapp"],
        version: CONTACT_CONSENT_VERSION,
        text: CONTACT_CONSENT_TEXT,
      })}\n`,
      "utf8"
    );
  } catch (error) {
    console.error("Saving contact consent failed:", error instanceof Error ? error.message : error);
  }
}
