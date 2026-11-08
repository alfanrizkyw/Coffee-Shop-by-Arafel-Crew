import { ApiError } from './errors';

interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 10000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count++;
  if (b.count > max) {
    throw new ApiError(429, 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.');
  }
}