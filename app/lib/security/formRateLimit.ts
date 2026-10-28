import "server-only";

import { NextResponse } from "next/server";

import { reportProblem } from "@/app/lib/monitoring/problems";

import { allow, clientIp, sweep } from "./rateLimit";

// Stops one visitor (or a script) from flooding a public form, our server,
// or Amit's inbox with thousands of submissions. Each endpoint gets its own
// bucket and its own limit, picked generously so a real customer never
// notices it (Amit, 2026-10-28).

const buckets = new Map<string, Map<string, { count: number; windowStart: number }>>();
let reported = new Set<string>();
let lastSweep = Date.now();

function bucketFor(name: string) {
  let bucket = buckets.get(name);
  if (!bucket) {
    bucket = new Map();
    buckets.set(name, bucket);
  }
  return bucket;
}

// Blocks the request and returns a response when the limit is hit; returns
// null when the request may continue.
export function rateLimited(
  request: Request,
  name: string,
  max: number,
  windowMs: number
): NextResponse | null {
  const ip = clientIp(request);
  const bucket = bucketFor(name);

  if (Date.now() - lastSweep > windowMs) {
    for (const b of buckets.values()) sweep(b, windowMs);
    lastSweep = Date.now();
    reported = new Set();
  }

  if (allow(bucket, ip, max, windowMs)) return null;

  const reportKey = `${name}:${ip}`;
  if (!reported.has(reportKey)) {
    reported.add(reportKey);
    void reportProblem({
      kind: "security",
      where: name,
      message: `An address sent more than ${max} requests in ${Math.round(windowMs / 60000)} minutes and was slowed down.`,
    });
  }

  return NextResponse.json(
    { success: false, message: "Too many requests. Please wait a few minutes and try again." },
    { status: 429 }
  );
}
