export type GameCategory = 'all' | 'puzzle' | 'card' | 'match' | 'farm' | 'strategy' | 'arcade';

export type GameSort = 'rating-desc' | 'rating-asc' | 'name-asc' | 'name-desc';

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
