import "server-only";

import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { leadsFile } from "@/app/lib/integrations/leadStore";

// Every Warrio chat is saved here, one JSON line per message or event, grouped
// by a chat id the customer's browser makes up. When the customer later gives
// their name and mobile, a "linked" line ties the whole chat to the lead, so
// Amit can read what was said before they paid or dropped off.

export type ChatLine = {
  date: string;
  chat_id: string;
  kind: "customer" | "warrio" | "event" | "linked";
  text: string;
  lead_reference?: string;
};

export function cleanChatId(value: unknown): string {
  return typeof value === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(value) ? value : "";
}

// The label used for invoice files uploaded in chat before a lead exists.
export function chatFileLabel(chatId: string) {
  return `CHAT-${chatId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

function chatsFile() {
  return path.join(/*turbopackIgnore: true*/ path.dirname(leadsFile()), "chats.jsonl");
}

// Never throws: saving a chat must not break the customer's answer.
export async function saveChatLine(line: Omit<ChatLine, "date">) {
  if (!line.chat_id) return;
  try {
    await mkdir(/*turbopackIgnore: true*/ path.dirname(chatsFile()), { recursive: true });
    const record: ChatLine = { date: new Date().toISOString(), ...line, text: line.text.slice(0, 4000) };
    await appendFile(/*turbopackIgnore: true*/ chatsFile(), `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    console.error("Saving chat failed:", error instanceof Error ? error.message : error);
  }
}

export async function readChatLines(): Promise<ChatLine[]> {
  let text: string;
  try {
    text = await readFile(/*turbopackIgnore: true*/ chatsFile(), "utf8");
  } catch {
    return [];
  }
  return text.split("\n").filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line) as ChatLine];
    } catch {
      return [];
    }
  });
}

export type ChatSession = {
  chat_id: string;
  started: string;
  last: string;
  lead_reference?: string;
  lines: ChatLine[];
};

function group(lines: ChatLine[]): ChatSession[] {
  const sessions = new Map<string, ChatSession>();
  for (const line of lines) {
    const session = sessions.get(line.chat_id) ?? {
      chat_id: line.chat_id,
      started: line.date,
      last: line.date,
      lines: [],
    };
    session.last = line.date;
    if (line.kind === "linked") session.lead_reference = line.lead_reference;
    session.lines.push(line);
    sessions.set(line.chat_id, session);
  }
  return [...sessions.values()];
}

// Newest chat first.
export async function readChatSessions(limit = 200): Promise<ChatSession[]> {
  return group(await readChatLines())
    .sort((a, b) => b.last.localeCompare(a.last))
    .slice(0, limit);
}

export async function readChatForLead(leadReference: string): Promise<ChatSession | null> {
  const lines = await readChatLines();
  const linked = lines.find((line) => line.kind === "linked" && line.lead_reference === leadReference);
  if (!linked) return null;
  return group(lines.filter((line) => line.chat_id === linked.chat_id))[0] ?? null;
}

export function transcript(session: ChatSession): string {
  const when = (date: string) =>
    new Date(date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return session.lines
    .filter((line) => line.kind !== "linked")
    .map((line) => {
      const who = line.kind === "customer" ? "Customer" : line.kind === "warrio" ? "Warrio" : "Step";
      return `[${when(line.date)}] ${who}: ${line.text}`;
    })
    .join("\n");
}
