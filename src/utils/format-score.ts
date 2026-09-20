/** Formats scores with thousands separators (e.g. 94250 → "94,250"). */
export function formatScore(value: number): string {
  return value.toLocaleString('en-US');
}
