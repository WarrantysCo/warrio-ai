import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

// Shared Basic Auth check for the admin pages: any user name, and the
// ADMIN_PASSWORD set on the host.

export function isAdminAllowed(request: Request) {
  const password = process.env.ADMIN_PASSWORD;
  const header = request.headers.get("authorization") || "";
  if (!password || !header.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const given = decoded.slice(decoded.indexOf(":") + 1);
  // Hashing first gives equal lengths, which timingSafeEqual needs.
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(given), hash(password));
}

export function adminAuthRequired() {
  return new Response("Password needed.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Warrio admin"' },
  });
}
