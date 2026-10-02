import { APP_PAGE } from '../utils/app-page';
import { hrefForLibraryQuery, parseLibraryQuery, type LibraryQuery } from '../utils/library-query';
import { resolvePageFromPath } from '../utils/route-path';

type LibraryQueryListener = (query: LibraryQuery) => void;

const DEFAULT_QUERY: LibraryQuery = { page: 1 };

const listeners = new Set<LibraryQueryListener>();

function readQueryFromLocation(): LibraryQuery {
  if (resolvePageFromPath(globalThis.location.pathname) !== APP_PAGE.library) {
    return DEFAULT_QUERY;
  }

  return parseLibraryQuery(globalThis.location.search).query;
}

let currentQuery: LibraryQuery = readQueryFromLocation();

function setQuery(next: LibraryQuery): void {
  if (next.page === currentQuery.page) {
    return;
  }

  currentQuery = next;

  for (const listener of listeners) {
    listener(currentQuery);
  }
}

export function getLibraryQuery(): LibraryQuery {
  return currentQuery;
}

/** Does not invoke the listener with the current value — avoids a duplicate first fetch. */
export function subscribeLibraryQuery(listener: LibraryQueryListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function navigateLibraryPage(page: number): void {
  const nextPage = Math.max(1, Math.floor(page));

  if (
    nextPage === currentQuery.page &&
    resolvePageFromPath(globalThis.location.pathname) === APP_PAGE.library
  ) {
    return;
  }

  globalThis.history.pushState(
    undefined,
    '',
    hrefForLibraryQuery({ page: nextPage }, globalThis.location.search),
  );
  setQuery({ page: nextPage });
}

export function syncLibraryQueryFromLocation(): void {
  if (resolvePageFromPath(globalThis.location.pathname) !== APP_PAGE.library) {
    setQuery(DEFAULT_QUERY);
    return;
  }

  const { query, isCanonical } = parseLibraryQuery(globalThis.location.search);

  if (!isCanonical) {
    globalThis.history.replaceState(
      undefined,
      '',
      hrefForLibraryQuery(query, globalThis.location.search),
    );
  }

  setQuery(query);
}
