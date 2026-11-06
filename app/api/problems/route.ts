import { NextResponse } from "next/server";

import { reportProblem, type ProblemKind } from "@/app/lib/monitoring/problems";

// Where customers' browsers report a crash or a form that could not be sent
// (see app/lib/monitoring/reportFromBrowser.ts). Anyone can call it, so it
// only accepts a few kinds, cuts every field short and limits how many
// reports it takes, so it cannot be used to flood the log or Amit's inbox.

const BROWSER_KINDS: ProblemKind[] = ["page_crash", "browser_error", "form_failed"];

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_VISITOR = 20;
const MAX_TOTAL = 500;
let windowStart = Date.now();
let total = 0;
const perVisitor = new Map<string, number>();

function allowed(visitor: string) {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    total = 0;
    perVisitor.clear();
  }
  const count = perVisitor.get(visitor) ?? 0;
  if (count >= MAX_PER_VISITOR || total >= MAX_TOTAL) return false;
  perVisitor.set(visitor, count + 1);
  total += 1;
  return true;
}

function field(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value : undefined;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const kind = field(body, "kind") as ProblemKind | undefined;
  if (!kind || !BROWSER_KINDS.includes(kind)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const visitor =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!allowed(visitor)) return NextResponse.json({ ok: false }, { status: 429 });

  const mobile = field(body, "mobile");
  await reportProblem({
    kind,
    where: field(body, "where") ?? "",
    message: field(body, "message") ?? "",
    lead_reference: field(body, "leadReference"),
    mobile: mobile && /^[6-9]\d{9}$/.test(mobile) ? mobile : undefined,
    source: "browser",
  });
  return NextResponse.json({ ok: true });
}
