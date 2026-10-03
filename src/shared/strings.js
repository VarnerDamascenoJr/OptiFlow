export function readOptionalString(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function readNonEmptyString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
