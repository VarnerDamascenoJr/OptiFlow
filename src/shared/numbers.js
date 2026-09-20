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
