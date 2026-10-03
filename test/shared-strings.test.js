import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { readNonEmptyString, readOptionalString } from "../src/shared/strings.js";

describe("shared string parsing", function describeSharedStringParsing() {
  it("reads optional present strings without changing the original value", function testOptionalString() {
    assert.equal(readOptionalString("event", "fallback"), "event");
    assert.equal(readOptionalString("  event  ", "fallback"), "  event  ");
    assert.equal(readOptionalString("", "fallback"), "fallback");
    assert.equal(readOptionalString(null, "fallback"), "fallback");
  });

  it("normalizes non-empty strings for metadata readers", function testNonEmptyString() {
    assert.equal(readNonEmptyString("  request-id  "), "request-id");
    assert.equal(readNonEmptyString("   "), null);
    assert.equal(readNonEmptyString(undefined), null);
  });
});
