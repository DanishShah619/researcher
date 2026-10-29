interface Bucket {
  tokens: number;
  updatedAt: number;
}

export interface RateLimitOptions {
  /** Burst size: requests allowed back-to-back from a full bucket. */
  capacity: number;
  /** Sustained rate: tokens restored per second. */
  refillPerSecond: number;
  /** Upper bound on tracked keys, so a flood of distinct keys can't grow memory unbounded. */
  maxKeys?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * In-memory token-bucket limiter. State lives in this process only, so with
 * several instances each one enforces the limit separately.
 */
export function createRateLimiter({ capacity, refillPerSecond, maxKeys = 10_000 }: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  function refilled(bucket: Bucket, now: number): number {
    const elapsedSeconds = Math.max(0, now - bucket.updatedAt) / 1000;
    return Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);
  }

  function evictIfFull(now: number) {
    if (buckets.size < maxKeys) return;
    // A fully refilled bucket behaves exactly like a missing one, so drop those first
    for (const [key, bucket] of buckets) {
      if (refilled(bucket, now) >= capacity) buckets.delete(key);
    }
    // Still full: drop the oldest-inserted keys
    for (const key of buckets.keys()) {
      if (buckets.size < maxKeys) break;
      buckets.delete(key);
    }
  }

  return function take(key: string, now: number = Date.now()): RateLimitResult {
    const existing = buckets.get(key);
    const tokens = existing ? refilled(existing, now) : capacity;

    if (tokens < 1) {
      buckets.set(key, { tokens, updatedAt: now });
      return { allowed: false, retryAfterSeconds: Math.ceil((1 - tokens) / refillPerSecond) };
    }

    if (!existing) evictIfFull(now);
    buckets.set(key, { tokens: tokens - 1, updatedAt: now });
    return { allowed: true, retryAfterSeconds: 0 };
  };
}
