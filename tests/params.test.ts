import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBoundedInt, MAX_LIMIT } from "../lib/params";

test("parseBoundedInt falls back on missing or non-numeric input", () => {
  assert.equal(parseBoundedInt(null, 15, 1, MAX_LIMIT), 15);
  assert.equal(parseBoundedInt("", 15, 1, MAX_LIMIT), 15);
  assert.equal(parseBoundedInt("abc", 15, 1, MAX_LIMIT), 15);
});

test("parseBoundedInt clamps to the allowed range", () => {
  assert.equal(parseBoundedInt("8", 15, 1, MAX_LIMIT), 8);
  assert.equal(parseBoundedInt("0", 15, 1, MAX_LIMIT), 1);
  assert.equal(parseBoundedInt("-5", 15, 1, MAX_LIMIT), 1);
  assert.equal(parseBoundedInt("1000000", 15, 1, MAX_LIMIT), MAX_LIMIT);
  assert.equal(parseBoundedInt("12.9", 15, 1, MAX_LIMIT), 12);
});
