/** Formats like counts for UI (e.g. 54200 → "54.2K", 28750 → "28.7K"). */
export function formatCompactCount(value: number): string {
  if (value < 1000) {
    return String(value);
  }

  const thousands = Math.floor(value / 100) / 10;
  const rounded = Number.isInteger(thousands) ? String(thousands) : thousands.toFixed(1);

  return `${rounded}K`;
}
