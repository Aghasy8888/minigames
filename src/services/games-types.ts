/** `category` values accepted by `GET /api/games` (spec enum); `all` means no filter. */
export const GAME_CATEGORIES = [
  'all',
  'puzzle',
  'card',
  'match',
  'farm',
  'strategy',
  'arcade',
] as const;

export type GameCategory = (typeof GAME_CATEGORIES)[number];

export const GAME_CATEGORY_ALL: GameCategory = 'all';

/** `sort` values accepted by `GET /api/games` (spec enum). */
export const GAME_SORTS = ['rating-desc', 'rating-asc', 'name-asc', 'name-desc'] as const;

export type GameSort = (typeof GAME_SORTS)[number];

export const DEFAULT_GAME_SORT: GameSort = 'rating-desc';

export type GameListItem = {
  slug: string;
  name: string;
  category: string;
  price: string;
  shortDescription: string;
  rating: number;
  likesCount: number;
  cardImage: string;
};

export type GamesListAppliedFilter = {
  category?: string;
  sort?: string;
  featured?: boolean | string;
};

export type GamesListMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  appliedFilter?: GamesListAppliedFilter;
};

export type GamesListParameters = {
  featured?: boolean;
  page?: number;
  limit?: number;
  category?: GameCategory;
  sort?: GameSort;
};
