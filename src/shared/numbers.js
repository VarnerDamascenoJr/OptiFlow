export function round(value, decimals) {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

export function mean(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce(function sumValues(sum, value) {
    return sum + value;
  }, 0) / values.length;
}

export function readPositiveInteger(value, fallback) {
  return readNumberMatching(value, fallback, isPositiveInteger);
}

export function assertPositiveInteger(value, label) {
  assertNumberMatching(value, label, isPositiveInteger, "must be a positive integer");
}

export function readInteger(value, fallback = 0) {
  return readNumberMatching(value, fallback, Number.isInteger);
}

export function readOptionalNumber(value) {
  if (isFiniteNumber(value)) {
    return value;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function readOptionalInteger(value) {
  const number = readOptionalNumber(value);
  return Number.isInteger(number) ? number : undefined;
}

export function readOptionalPositiveInteger(value) {
  const number = readOptionalNumber(value);
  return readPositiveInteger(number, undefined);
}

export function readTcpPort(value, label) {
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(label + " must be a valid TCP port");
  }

  return port;
}

export function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function readFiniteNumber(value, fallback) {
  return readNumberMatching(value, fallback);
}

export function readNonNegativeNumber(value, fallback) {
  return readNumberMatching(value, fallback, isNonNegativeNumber);
}

export function readProbability(value, fallback) {
  return readNumberMatching(value, fallback, isProbability);
}

function readNumberMatching(value, fallback, predicate) {
  if (!isFiniteNumber(value)) {
    return fallback;
  }

  return predicate === undefined || predicate(value) ? value : fallback;
}

function assertNumberMatching(value, label, predicate, message) {
  if (!isFiniteNumber(value) || !predicate(value)) {
    throw new Error(label + " " + message);
  }
}

function isNonNegativeNumber(value) {
  return value >= 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isProbability(value) {
  return value >= 0 && value <= 1;
}
