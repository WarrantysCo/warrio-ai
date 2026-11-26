import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

// Shared Basic Auth check for the admin pages: any user name, and the
// ADMIN_PASSWORD set on the host.

// Hashing first gives equal lengths, which timingSafeEqual needs.
function matches(given: string, expected: string) {
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(given), hash(expected));
}

export function isAdminAllowed(request: Request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  // Automated checks (our own scheduled site-health jobs) send the password
  // directly in a header instead of a Basic Auth challenge/response, because
  // some browsers' automated-fetch paths stall waiting on the native login
  // popup a 401 WWW-Authenticate reply would normally trigger for a person.
  const direct = request.headers.get("x-admin-password");
  if (direct) return matches(direct, password);

  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const given = decoded.slice(decoded.indexOf(":") + 1);
  return matches(given, password);
}

export function adminAuthRequired() {
  return new Response("Password needed.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Warrio admin"' },
  });
}
