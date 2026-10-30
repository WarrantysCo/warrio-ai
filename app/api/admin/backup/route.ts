import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { adminAuthRequired, isAdminAllowed } from "@/app/lib/adminAuth";

// Bundles the site's own records (leads, warranty/certificate events, error
// reports) into one file so they can be copied somewhere outside Hostinger.
// These already live outside the app folder (warrio-data/), so a bad deploy
// can't lose them — this is only for the case Hostinger itself has a problem.

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(/*turbopackIgnore: true*/ os.homedir(), "warrio-data");
const FILES = ["leads.jsonl", "warranty.jsonl", "problems.jsonl"] as const;

async function readIfExists(file: string) {
  try {
    return await readFile(/*turbopackIgnore: true*/ file, "utf8");
  } catch {
    return "";
  }
}

export async function GET(request: Request) {
  if (!isAdminAllowed(request)) return adminAuthRequired();

  const files: Record<string, string> = {};
  for (const name of FILES) {
    files[name] = await readIfExists(path.join(DATA_DIR, name));
  }

  const bundle = {
    generated_at: new Date().toISOString(),
    files,
  };

  return new Response(JSON.stringify(bundle), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="warrio-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
