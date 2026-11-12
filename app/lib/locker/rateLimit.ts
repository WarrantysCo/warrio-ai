import "server-only";

// A small per-visitor limit for the public bill-reading endpoint, so nobody
// can run up the AI bill by uploading files in a loop. Kept in memory: it
// resets when the site restarts, which is fine for this purpose.

const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

export function allowRequest(request: Request, limit: number) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
