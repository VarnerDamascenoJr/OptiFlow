export function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new TypeError(label + " must be an array");
  }
}

export function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(label + " must be an object");
  }
}

export function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(label + " must be a non-empty string");
  }
}
