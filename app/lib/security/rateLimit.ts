import "server-only";

// A small in-memory rate limiter, shared by the admin login and the public
// forms. It resets if the server restarts, which is fine: the goal is to
// slow down a flood or a password-guessing script, not to be perfect.

type Bucket = { count: number; windowStart: number };

export function clientIp(request: Request) {
  // Hostinger (like most hosts) sits in front of the app, so the real
  // visitor address is in this header, not the raw socket.
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

// true = allowed, false = over the limit. `key` lets the same visitor have
// a separate limit per use (admin login vs. a form), and `buckets` is a
// Map owned by the caller so different limits don't share counters.
export function allow(buckets: Map<string, Bucket>, key: string, max: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

// Keeps every limiter's map from growing forever on a long-running server.
export function sweep(buckets: Map<string, Bucket>, windowMs: number) {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= windowMs) buckets.delete(key);
  }
}
