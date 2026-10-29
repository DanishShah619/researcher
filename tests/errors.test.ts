import { test } from "node:test";
import assert from "node:assert/strict";
import { Neo4jError } from "neo4j-driver";
import { publicDbErrorMessage } from "../lib/errors";

const dbError = (message: string, code: string) =>
  new Neo4jError(message, code, "50N42", "error: general processing exception");

test("never exposes the raw driver message", () => {
  const raw = "Failed to connect to server bolt://internal-host:7687";
  for (const err of [dbError(raw, "ServiceUnavailable"), dbError(raw, "Neo.ClientError.Statement.SyntaxError"), new Error(raw), raw]) {
    assert.ok(!publicDbErrorMessage(err).includes("internal-host"));
  }
});

test("distinguishes an unreachable database", () => {
  assert.match(publicDbErrorMessage(dbError("x", "ServiceUnavailable")), /unreachable/);
  assert.doesNotMatch(publicDbErrorMessage(new Error("x")), /unreachable/);
});
