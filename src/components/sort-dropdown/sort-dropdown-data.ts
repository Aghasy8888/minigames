import { DEFAULT_GAME_SORT, type GameSort } from '../../services/games-api-provider';

export interface SortOption {
  id: GameSort;
  label: string;
}

export const SORT_OPTIONS: readonly SortOption[] = [
  { id: 'rating-asc', label: 'Rating ↑' },
  { id: 'rating-desc', label: 'Rating ↓' },
  { id: 'name-asc', label: 'Name A→Z' },
  { id: 'name-desc', label: 'Name Z→A' },
] as const;

export const SORT_TRIGGER_PREFIX = 'Sort by:';
export const SORT_TRIGGER_ARIA_LABEL = 'Sort games';

export const DEFAULT_SORT_OPTION =
  SORT_OPTIONS.find((option) => option.id === DEFAULT_GAME_SORT) ?? SORT_OPTIONS[0];

export const KEY_ENTER = 'Enter';
export const KEY_SPACE = ' ';
export const KEY_ARROW_DOWN = 'ArrowDown';
export const KEY_ARROW_UP = 'ArrowUp';
export const KEY_HOME = 'Home';
export const KEY_END = 'End';
