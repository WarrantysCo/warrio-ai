import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { reportProblem } from "@/app/lib/monitoring/problems";
import { clientIp } from "@/app/lib/security/rateLimit";

// Shared Basic Auth check for the admin pages: any user name, and the
// ADMIN_PASSWORD set on the host.

// Locks an address out after repeated wrong passwords, so a script cannot
// sit there guessing. Counts only wrong attempts, so Amit's own browser
// loading /admin normally never trips it (Amit, 2026-10-28).
const WINDOW_MS = 15 * 60 * 1000;
const MAX_WRONG_ATTEMPTS = 8;
const wrongAttempts = new Map<string, { count: number; windowStart: number }>();

function isLockedOut(ip: string) {
  const bucket = wrongAttempts.get(ip);
  if (!bucket) return false;
  if (Date.now() - bucket.windowStart >= WINDOW_MS) {
    wrongAttempts.delete(ip);
    return false;
  }
  return bucket.count >= MAX_WRONG_ATTEMPTS;
}

function recordWrongAttempt(ip: string) {
  const now = Date.now();
  const bucket = wrongAttempts.get(ip);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    wrongAttempts.set(ip, { count: 1, windowStart: now });
    return 1;
  }
  bucket.count += 1;
  return bucket.count;
}

export type AdminCheckResult = "ok" | "wrong_password" | "locked_out";

export function checkAdminPassword(request: Request): AdminCheckResult {
  const ip = clientIp(request);
  if (isLockedOut(ip)) return "locked_out";

  const password = process.env.ADMIN_PASSWORD;
  const header = request.headers.get("authorization") || "";
  const decoded = header.startsWith("Basic ")
    ? Buffer.from(header.slice(6), "base64").toString("utf8")
    : "";
  const given = decoded.slice(decoded.indexOf(":") + 1);

  // Hashing first gives equal lengths, which timingSafeEqual needs.
  const hash = (value: string) => createHash("sha256").update(value).digest();
  const correct = Boolean(password) && timingSafeEqual(hash(given), hash(password || ""));
  if (correct) return "ok";

  // A browser's very first request has no Authorization header yet (that is
  // how Basic Auth asks for one) and is not someone guessing, so it does not
  // count as a wrong attempt.
  if (!header.startsWith("Basic ")) return "wrong_password";

  const attempt = recordWrongAttempt(ip);
  if (attempt === MAX_WRONG_ATTEMPTS) {
    void reportProblem({
      kind: "security",
      where: "/admin login",
      message: `An address was blocked from the admin pages after ${MAX_WRONG_ATTEMPTS} wrong passwords in 15 minutes.`,
    });
  }
  return "wrong_password";
}

export function adminAuthRequired(result: AdminCheckResult = "wrong_password") {
  if (result === "locked_out") {
    return new Response(
      "Too many wrong passwords. Please wait 15 minutes and try again.",
      { status: 429 }
    );
  }
  return new Response("Password needed.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Warrio admin"' },
  });
}
