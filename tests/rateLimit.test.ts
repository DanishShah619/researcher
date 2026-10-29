import { test } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../lib/rateLimit";

test("allows a full burst, then rejects with Retry-After", () => {
  const take = createRateLimiter({ capacity: 3, refillPerSecond: 1 });
  const t0 = 1_000_000;
  assert.equal(take("ip", t0).allowed, true);
  assert.equal(take("ip", t0).allowed, true);
  assert.equal(take("ip", t0).allowed, true);
  const blocked = take("ip", t0);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 1);
});

test("refills over time", () => {
  const take = createRateLimiter({ capacity: 1, refillPerSecond: 0.5 });
  const t0 = 1_000_000;
  assert.equal(take("ip", t0).allowed, true);
  assert.equal(take("ip", t0 + 1000).allowed, false);
  assert.equal(take("ip", t0 + 3000).allowed, true);
});

test("tracks clients independently", () => {
  const take = createRateLimiter({ capacity: 1, refillPerSecond: 1 });
  assert.equal(take("a", 0).allowed, true);
  assert.equal(take("b", 0).allowed, true);
  assert.equal(take("a", 0).allowed, false);
});

test("bounds the number of tracked keys", () => {
  const take = createRateLimiter({ capacity: 1, refillPerSecond: 0.001, maxKeys: 2 });
  take("a", 0);
  take("b", 0);
  take("c", 0); // evicts the oldest key ("a"), which therefore gets a fresh bucket
  assert.equal(take("a", 0).allowed, true);
});
