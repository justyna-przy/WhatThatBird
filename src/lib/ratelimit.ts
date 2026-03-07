/**
 * ratelimit.ts — simple in-memory per-IP rate limiter.
 *
 * Allows MAX_REQUESTS per WINDOW_MS per IP address.
 * Uses a Map with automatic expiry — no external dependency needed.
 */

const MAX_REQUESTS = 2;   // requests per window
const WINDOW_MS    = 60_000; // 1 minute

interface Entry {
  count: number;
  resetAt: number;
}

const _store = new Map<string, Entry>();

/** Returns true if the IP is allowed, false if rate-limited. */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = _store.get(ip);

  if (!entry || now > entry.resetAt) {
    _store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) return false;

  entry.count++;
  return true;
}

/** How many seconds until the window resets for this IP. */
export function retryAfterSeconds(ip: string): number {
  const entry = _store.get(ip);
  if (!entry) return 0;
  return Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));
}
