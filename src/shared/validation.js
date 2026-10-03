export function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new TypeError(label + " must be an array");
  }
}

export function assertNonEmptyArray(value, label, itemName) {
  assertArray(value, label);

  if (value.length === 0) {
    throw new Error(label + " must contain at least one " + itemName);
  }
}

export function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(label + " must be an object");
  }
}

export function assertRequiredObject(value, message) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }
}

export function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(label + " must be a non-empty string");
  }
}

export function assertEquals(value, expected, label) {
  if (value !== expected) {
    throw new Error(label + " must be " + expected);
  }
}

export function assertSchemaVersion(value, expected, label) {
  assertEquals(value, expected, label);
}

export function assertNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(label + " must be a finite number");
  }
}

export function assertPositiveNumber(value, label) {
  assertNumber(value, label);

  if (value <= 0) {
    throw new Error(label + " must be greater than zero");
  }
}

export function assertNonNegativeNumber(value, label) {
  assertNumber(value, label);

  if (value < 0) {
    throw new Error(label + " must be greater than or equal to zero");
  }
}

export function assertOptionalBoolean(value, label) {
  if (value !== undefined && typeof value !== "boolean") {
    throw new TypeError(label + " must be a boolean");
  }
}
