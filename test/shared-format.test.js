import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatNullableNumber, formatSignedNumber } from "../src/shared/format.js";

describe("shared report formatting", function describeSharedReportFormatting() {
  it("formats positive deltas with an explicit sign", function testSignedNumbers() {
    assert.equal(formatSignedNumber(3), "+3");
    assert.equal(formatSignedNumber(0), "0");
    assert.equal(formatSignedNumber(-2), "-2");
  });

  it("formats nullable numbers with a configurable placeholder", function testNullableNumbers() {
    assert.equal(formatNullableNumber(1.5), "1.5");
    assert.equal(formatNullableNumber(null), "n/a");
    assert.equal(formatNullableNumber(null, "not_available"), "not_available");
  });
});
