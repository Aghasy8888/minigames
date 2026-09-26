export interface SortOption {
  id: string;
  label: string;
  isDefault?: boolean;
}

export const SORT_OPTIONS: readonly SortOption[] = [
  { id: 'rating-asc', label: 'Rating ↑' },
  { id: 'rating-desc', label: 'Rating ↓', isDefault: true },
  { id: 'name-asc', label: 'Name A→Z' },
  { id: 'name-desc', label: 'Name Z→A' },
] as const;

export const SORT_TRIGGER_PREFIX = 'Sort by:';

export const DEFAULT_SORT_OPTION =
  SORT_OPTIONS.find((option) => option.isDefault) ?? SORT_OPTIONS[0];

export const KEY_ENTER = 'Enter';
export const KEY_SPACE = ' ';
export const KEY_ARROW_DOWN = 'ArrowDown';
export const KEY_ARROW_UP = 'ArrowUp';
export const KEY_HOME = 'Home';
export const KEY_END = 'End';
export const KEY_ESCAPE = 'Escape';
