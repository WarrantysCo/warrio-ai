import "server-only";

import { appendFile, mkdir, readFile } from "node:fs/promises";
import { randomInt } from "node:crypto";
import path from "node:path";

import { leadsFile } from "@/app/lib/integrations/leadStore";
import { siteUrl } from "@/app/lib/warranty/link";

// Partners who sell Warrantys.co plans for a commission. Kept next to
// leads.jsonl, one JSON line per event (applied, approved, paused), so
// nothing is ever rewritten. A partner only gets a code after Amit approves.

export type PartnerApplication = {
  type: "apply";
  date: string;
  partner_id: string;
  business_name: string;
  owner_name: string;
  mobile: string;
  email: string;
  business_type: string;
  city: string;
  address: string;
  website: string;
  gst: string;
  pan: string;
  registration_no: string;
  proof_file: string;
  devices_per_month: string;
};

type PartnerDecision = {
  type: "approve" | "pause" | "resume";
  date: string;
  partner_id: string;
  code?: string;
};

export type Partner = Omit<PartnerApplication, "type" | "date"> & {
  applied_at: string;
  status: "pending" | "approved" | "paused";
  code: string;
};

function partnersFile() {
  return path.join(/*turbopackIgnore: true*/ path.dirname(leadsFile()), "partners.jsonl");
}

async function appendEvent(event: PartnerApplication | PartnerDecision) {
  await mkdir(/*turbopackIgnore: true*/ path.dirname(partnersFile()), { recursive: true });
  await appendFile(/*turbopackIgnore: true*/ partnersFile(), `${JSON.stringify(event)}\n`, "utf8");
}

export async function readPartners(): Promise<Partner[]> {
  let text: string;
  try {
    text = await readFile(/*turbopackIgnore: true*/ partnersFile(), "utf8");
  } catch {
    return [];
  }
  const partners = new Map<string, Partner>();
  for (const line of text.split("\n").filter(Boolean)) {
    let event: PartnerApplication | PartnerDecision;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "apply") {
      const { type: _type, date, ...rest } = event;
      void _type;
      partners.set(event.partner_id, { ...rest, applied_at: date, status: "pending", code: "" });
      continue;
    }
    const partner = partners.get(event.partner_id);
    if (!partner) continue;
    if (event.type === "approve" && event.code) {
      partner.status = "approved";
      partner.code = event.code;
    }
    if (event.type === "pause") partner.status = "paused";
    if (event.type === "resume") partner.status = partner.code ? "approved" : "pending";
  }
  return [...partners.values()].reverse();
}

export async function savePartnerApplication(application: PartnerApplication): Promise<boolean> {
  try {
    await appendEvent(application);
    return true;
  } catch (error) {
    console.error("Saving partner application failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

// No 0/O/1/I so a code read out loud or from a printed QR is never confused.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode() {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

export async function approvePartner(partnerId: string): Promise<Partner | null> {
  const partners = await readPartners();
  const partner = partners.find((row) => row.partner_id === partnerId);
  if (!partner) return null;
  if (partner.code) {
    // Already has a code: approving again only lifts a pause.
    if (partner.status === "paused") await appendEvent({ type: "resume", date: new Date().toISOString(), partner_id: partnerId });
    return { ...partner, status: "approved" };
  }
  const taken = new Set(partners.map((row) => row.code).filter(Boolean));
  let code = newCode();
  while (taken.has(code)) code = newCode();
  await appendEvent({ type: "approve", date: new Date().toISOString(), partner_id: partnerId, code });
  return { ...partner, status: "approved", code };
}

export async function pausePartner(partnerId: string) {
  await appendEvent({ type: "pause", date: new Date().toISOString(), partner_id: partnerId });
}

export function partnerLink(code: string, medium: "link" | "qr" = "link") {
  return `${siteUrl()}/warranty-check?partner=${code}&utm_source=partner&utm_medium=${medium}&utm_campaign=${code}`;
}

// The partner code a visitor arrived with (set by PartnerTracker), but only
// when it belongs to a partner Amit has approved and not paused.
export async function activePartnerCode(request: Request): Promise<string> {
  const match = /(?:^|;\s*)warrio_partner=([A-Z0-9]{4,12})(?:;|$)/.exec(request.headers.get("cookie") ?? "");
  if (!match) return "";
  const partner = (await readPartners()).find((row) => row.code === match[1]);
  return partner?.status === "approved" ? partner.code : "";
}
