import { test } from "node:test";
import assert from "node:assert/strict";
import { pathTracerHref } from "../lib/links";

test("pathTracerHref encodes ids and names", () => {
  const href = pathTracerHref({ id: "45/6", name: "Ada Lovelace & Co" });
  const params = new URL(href, "http://x").searchParams;
  assert.equal(new URL(href, "http://x").pathname, "/path_tracer");
  assert.equal(params.get("authorA"), "45/6");
  assert.equal(params.get("nameA"), "Ada Lovelace & Co");
  assert.equal(params.has("authorB"), false);
});

test("pathTracerHref includes the second author when given", () => {
  const params = new URL(
    pathTracerHref({ id: "1", name: "A" }, { id: "2", name: "B" }),
    "http://x",
  ).searchParams;
  assert.equal(params.get("authorB"), "2");
  assert.equal(params.get("nameB"), "B");
});
