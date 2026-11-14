/**
 * Best-effort per-IP limit for the explain route: at most LIMIT calls in any
 * WINDOW_MS sliding window. In-memory, so it resets on cold start and is not
 * shared between instances. The real limits are the Vercel firewall rule and
 * the API spend cap; this only stops one client hammering one instance.
 */

export const LIMIT = 10;
export const WINDOW_MS = 10 * 60_000;
const MAX_IPS = 5_000;

const calls = new Map<string, number[]>();

export function allow(ip: string, now: number = Date.now()): boolean {
  const recent = (calls.get(ip) ?? []).filter((t) => t > now - WINDOW_MS);
  const ok = recent.length < LIMIT;
  if (ok) recent.push(now);
  calls.delete(ip); // re-insert so Map order tracks recency
  calls.set(ip, recent);
  if (calls.size > MAX_IPS) calls.delete(calls.keys().next().value!);
  return ok;
}

export function resetRateLimit(): void {
  calls.clear();
}
