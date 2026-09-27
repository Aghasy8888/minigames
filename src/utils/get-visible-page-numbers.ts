/**
 * Returns a contiguous window of page numbers that always includes `currentPage`.
 */
export function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number,
): number[] {
  if (totalPages < 1 || maxVisible < 1) {
    return [];
  }

  const clampedTotal = Math.floor(totalPages);
  const clampedMax = Math.min(Math.floor(maxVisible), clampedTotal);
  const clampedCurrent = Math.min(Math.max(Math.floor(currentPage), 1), clampedTotal);

  if (clampedTotal <= clampedMax) {
    return Array.from({ length: clampedTotal }, (_, index) => index + 1);
  }

  const half = Math.floor((clampedMax - 1) / 2);
  let start = clampedCurrent - half;
  start = Math.max(1, Math.min(start, clampedTotal - clampedMax + 1));

  return Array.from({ length: clampedMax }, (_, index) => start + index);
}
