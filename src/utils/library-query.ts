import {
  DEFAULT_GAME_SORT,
  GAME_CATEGORIES,
  GAME_SORTS,
  type GameCategory,
  type GameSort,
} from '../services/games-types';
import { APP_PAGE } from './app-page';
import { hrefForPage } from './route-path';

export const DEFAULT_LIBRARY_PAGE = 1;

export type LibraryQuery = {
  page: number;
  category?: GameCategory;
  sort: GameSort;
};

export const DEFAULT_LIBRARY_QUERY: LibraryQuery = {
  page: DEFAULT_LIBRARY_PAGE,
  sort: DEFAULT_GAME_SORT,
};

const PAGE_PATTERN = /^[1-9]\d*$/;
const CATEGORY_VALUES = new Set<string>(GAME_CATEGORIES);
const SORT_VALUES = new Set<string>(GAME_SORTS);

export function isGameCategory(value: string | null | undefined): value is GameCategory {
  return value !== null && value !== undefined && CATEGORY_VALUES.has(value);
}

export function isGameSort(value: string | null | undefined): value is GameSort {
  return value !== null && value !== undefined && SORT_VALUES.has(value);
}

function toSearchParameters(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

function parsePage(raw: string | null): { page: number; isCanonical: boolean } {
  if (raw === null) {
    return { page: DEFAULT_LIBRARY_PAGE, isCanonical: true };
  }

  if (!PAGE_PATTERN.test(raw)) {
    return { page: DEFAULT_LIBRARY_PAGE, isCanonical: false };
  }

  const page = Number(raw);
  return { page, isCanonical: page !== DEFAULT_LIBRARY_PAGE };
}

export function parseLibraryQuery(search: string): {
  query: LibraryQuery;
  isCanonical: boolean;
} {
  const searchParameters = toSearchParameters(search);
  const page = parsePage(searchParameters.get('page'));

  const rawCategory = searchParameters.get('category');
  const category = isGameCategory(rawCategory) ? rawCategory : undefined;
  const isCategoryCanonical = rawCategory === null || category !== undefined;

  const rawSort = searchParameters.get('sort');
  const sort = isGameSort(rawSort) ? rawSort : DEFAULT_GAME_SORT;
  const isSortCanonical =
    rawSort === null || (isGameSort(rawSort) && rawSort !== DEFAULT_GAME_SORT);

  return {
    query: { page: page.page, category, sort },
    isCanonical: page.isCanonical && isCategoryCanonical && isSortCanonical,
  };
}

export function hrefForLibraryQuery(
  query: LibraryQuery,
  currentSearch = '',
  defaultCategory?: GameCategory,
): string {
  const searchParameters = toSearchParameters(currentSearch);

  if (query.category === undefined || query.category === defaultCategory) {
    searchParameters.delete('category');
  } else {
    searchParameters.set('category', query.category);
  }

  if (query.sort === DEFAULT_GAME_SORT) {
    searchParameters.delete('sort');
  } else {
    searchParameters.set('sort', query.sort);
  }

  if (query.page <= DEFAULT_LIBRARY_PAGE) {
    searchParameters.delete('page');
  } else {
    searchParameters.set('page', String(query.page));
  }

  const serialized = searchParameters.toString();
  const path = hrefForPage(APP_PAGE.library);
  return serialized === '' ? path : `${path}?${serialized}`;
}
