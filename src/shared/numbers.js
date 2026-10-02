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
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function readFiniteNumber(value, fallback) {
  return isFiniteNumber(value) ? value : fallback;
}

export function readNonNegativeNumber(value, fallback) {
  return isFiniteNumber(value) && value >= 0 ? value : fallback;
}

export function readProbability(value, fallback) {
  return isFiniteNumber(value) && value >= 0 && value <= 1 ? value : fallback;
}
