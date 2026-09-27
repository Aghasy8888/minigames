/** Formats a seed category for badge display (`strategy` → `Strategy`). */
export function formatCategoryLabel(category: string): string {
  if (!category) {
    return '';
  }

  return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}
