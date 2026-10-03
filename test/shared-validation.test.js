import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  assertEquals,
  assertNonEmptyArray,
  assertOptionalBoolean,
  assertRequiredObject,
  assertSchemaVersion
} from "../src/shared/validation.js";

describe("shared validation helpers", function describeSharedValidationHelpers() {
  it("validates reusable domain predicates with stable messages", function testValidationHelpers() {
    assert.doesNotThrow(function assertValidValues() {
      assertEquals("v1", "v1", "document.schemaVersion");
      assertSchemaVersion("schema.v1", "schema.v1", "document.schemaVersion");
      assertOptionalBoolean(undefined, "constraints.enabled");
      assertOptionalBoolean(false, "constraints.enabled");
      assertNonEmptyArray(["COMPLETED"], "options.completedStatuses", "status");
      assertRequiredObject({ id: "study" }, "Study input must be an object");
    });

    assert.throws(
      function assertInvalidSchemaVersion() {
        assertSchemaVersion("schema.v0", "schema.v1", "document.schemaVersion");
      },
      /document.schemaVersion must be schema.v1/
    );
    assert.throws(
      function assertInvalidRequiredObject() {
        assertRequiredObject(null, "Study input must be an object");
      },
      /Study input must be an object/
    );
  });
});
