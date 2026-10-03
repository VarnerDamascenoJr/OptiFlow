import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  assertPositiveInteger,
  readFiniteNumber,
  readInteger,
  readNonNegativeNumber,
  readOptionalInteger,
  readOptionalNumber,
  readOptionalPositiveInteger,
  readProbability,
  readTcpPort
} from "../src/shared/numbers.js";

describe("shared numeric parsing", function describeSharedNumericParsing() {
  it("parses optional numeric environment values in one place", function testOptionalNumericValues() {
    assert.equal(readOptionalNumber(undefined), undefined);
    assert.equal(readOptionalNumber(""), undefined);
    assert.equal(readOptionalNumber("  "), undefined);
    assert.equal(readOptionalNumber(0), 0);
    assert.equal(readOptionalNumber("0.25"), 0.25);
    assert.equal(readOptionalNumber("not-a-number"), undefined);
    assert.equal(readOptionalNumber(true), undefined);
    assert.equal(readOptionalInteger("42"), 42);
    assert.equal(readOptionalInteger("42.5"), undefined);
  });

  it("keeps optional positive integers bounded to positive whole numbers", function testPositiveIntegers() {
    assert.equal(readOptionalPositiveInteger(undefined), undefined);
    assert.equal(readOptionalPositiveInteger(""), undefined);
    assert.equal(readOptionalPositiveInteger("3"), 3);
    assert.equal(readOptionalPositiveInteger("0"), undefined);
    assert.equal(readOptionalPositiveInteger("3.5"), undefined);
  });

  it("reuses the same finite-number reader for bounded numeric values", function testBoundedNumbers() {
    assert.equal(readFiniteNumber(1.5, 0), 1.5);
    assert.equal(readFiniteNumber("1.5", 0), 0);
    assert.equal(readNonNegativeNumber(0, 10), 0);
    assert.equal(readNonNegativeNumber(-1, 10), 10);
    assert.equal(readProbability(0.75, null), 0.75);
    assert.equal(readProbability(1.5, null), null);
  });

  it("asserts and reads integer values with shared predicates", function testIntegerHelpers() {
    assert.equal(readInteger(7), 7);
    assert.equal(readInteger("7"), 0);
    assert.equal(readInteger(1.5), 0);
    assert.doesNotThrow(function assertValidInteger() {
      assertPositiveInteger(1, "quantity");
    });
    assert.throws(
      function assertInvalidInteger() {
        assertPositiveInteger(0, "quantity");
      },
      /quantity must be a positive integer/
    );
  });

  it("validates TCP ports with the caller label", function testTcpPort() {
    assert.equal(readTcpPort("3000", "OPTIFLOW_API_PORT"), 3000);
    assert.throws(
      function readInvalidPort() {
        readTcpPort("70000", "OPTIFLOW_API_PORT");
      },
      /OPTIFLOW_API_PORT must be a valid TCP port/
    );
  });
});
