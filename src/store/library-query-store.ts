import { GAME_CATEGORY_ALL, type GameCategory, type GameSort } from '../services/games-types';
import { APP_PAGE } from '../utils/app-page';
import {
  DEFAULT_LIBRARY_QUERY,
  hrefForLibraryQuery,
  isGameCategory,
  parseLibraryQuery,
  type LibraryQuery,
} from '../utils/library-query';
import { resolvePageFromPath } from '../utils/route-path';

type LibraryQueryListener = (query: LibraryQuery) => void;

const listeners = new Set<LibraryQueryListener>();

let defaultCategory: GameCategory | undefined;

function isOnLibrary(): boolean {
  return resolvePageFromPath(globalThis.location.pathname) === APP_PAGE.library;
}

function readQueryFromLocation(): LibraryQuery {
  return isOnLibrary()
    ? parseLibraryQuery(globalThis.location.search).query
    : DEFAULT_LIBRARY_QUERY;
}

let currentQuery: LibraryQuery = readQueryFromLocation();

function isSameQuery(a: LibraryQuery, b: LibraryQuery): boolean {
  return a.page === b.page && a.category === b.category && a.sort === b.sort;
}

function notify(): void {
  for (const listener of listeners) {
    listener(currentQuery);
  }
}

function setQuery(next: LibraryQuery): void {
  if (isSameQuery(next, currentQuery)) {
    return;
  }

  currentQuery = next;
  notify();
}

function writeUrl(query: LibraryQuery, mode: 'push' | 'replace'): void {
  const href = hrefForLibraryQuery(query, globalThis.location.search, defaultCategory);

  if (mode === 'push') {
    globalThis.history.pushState(undefined, '', href);
  } else {
    globalThis.history.replaceState(globalThis.history.state, '', href);
  }
}

function pushQuery(next: LibraryQuery): boolean {
  if (isSameQuery(next, currentQuery) && isOnLibrary()) {
    return false;
  }

  writeUrl(next, 'push');
  setQuery(next);
  return true;
}

export function getLibraryQuery(): LibraryQuery {
  return currentQuery;
}

export function getDefaultCategory(): GameCategory | undefined {
  return defaultCategory;
}

/** Category sent to the API: the URL value, else the API default chip, else the spec's no-filter value. */
export function getResolvedCategory(): GameCategory {
  return currentQuery.category ?? defaultCategory ?? GAME_CATEGORY_ALL;
}

/** Does not invoke the listener with the current value — avoids a duplicate first fetch. */
export function subscribeLibraryQuery(listener: LibraryQueryListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function navigateLibraryPage(page: number): void {
  if (pushQuery({ ...currentQuery, page: Math.max(1, Math.floor(page)) })) {
    globalThis.scrollTo({ top: 0 });
  }
}

export function navigateLibraryCategory(category: GameCategory): void {
  if (category === getResolvedCategory()) {
    return;
  }

  pushQuery({
    page: DEFAULT_LIBRARY_QUERY.page,
    category: category === defaultCategory ? undefined : category,
    sort: currentQuery.sort,
  });
}

export function navigateLibrarySort(sort: GameSort): void {
  if (sort === currentQuery.sort) {
    return;
  }

  pushQuery({ page: DEFAULT_LIBRARY_QUERY.page, category: currentQuery.category, sort });
}

export function resetLibraryFilters(): void {
  pushQuery({ page: DEFAULT_LIBRARY_QUERY.page, sort: currentQuery.sort });
}

/**
 * Records the API's default chip. A URL category equal to the default, or missing from the API
 * list, is dropped with `replaceState`; listeners run only if the requested category changes.
 */
export function setDefaultCategory(slug: string | undefined, validSlugs: readonly string[]): void {
  const previousResolved = getResolvedCategory();
  defaultCategory = isGameCategory(slug) ? slug : undefined;

  const urlCategory = currentQuery.category;
  const isUnknown =
    validSlugs.length > 0 && urlCategory !== undefined && !validSlugs.includes(urlCategory);

  if (
    isOnLibrary() &&
    urlCategory !== undefined &&
    (urlCategory === defaultCategory || isUnknown)
  ) {
    currentQuery = { ...currentQuery, category: undefined };
    writeUrl(currentQuery, 'replace');
  }

  if (previousResolved !== getResolvedCategory()) {
    notify();
  }
}

/** Runs before the page swaps, so leaving Library resets the query without notifying the still-mounted view. */
export function syncLibraryQueryFromLocation(): void {
  if (!isOnLibrary()) {
    currentQuery = DEFAULT_LIBRARY_QUERY;
    return;
  }

  const parsed = parseLibraryQuery(globalThis.location.search);
  const isDefaultCategory =
    parsed.query.category !== undefined && parsed.query.category === defaultCategory;
  const query = isDefaultCategory ? { ...parsed.query, category: undefined } : parsed.query;

  if (!parsed.isCanonical || isDefaultCategory) {
    writeUrl(query, 'replace');
  }

  setQuery(query);
}
