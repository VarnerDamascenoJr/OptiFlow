export function formatSignedNumber(value) {
  return value > 0 ? "+" + value : String(value);
}

export function formatNullableNumber(value, placeholder = "n/a") {
  return value === null ? placeholder : String(value);
}
