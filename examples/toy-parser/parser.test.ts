import assert from "node:assert/strict";
import test from "node:test";

import { parseAssignment } from "./parser.ts";

test("parses a key/value assignment", () => {
  assert.deepEqual(parseAssignment("mode = safe"), {
    key: "mode",
    value: "safe",
  });
});

test("keeps equals signs inside the value", () => {
  assert.deepEqual(parseAssignment("query=a=b"), {
    key: "query",
    value: "a=b",
  });
});

test("rejects malformed input", () => {
  assert.throws(() => parseAssignment("missing-separator"), /key=value/);
  assert.throws(() => parseAssignment("empty="), /required/);
});
