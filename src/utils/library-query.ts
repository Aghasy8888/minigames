import { APP_PAGE } from './app-page';
import { hrefForPage } from './route-path';

export const DEFAULT_LIBRARY_PAGE = 1;

export type LibraryQuery = {
  page: number;
};

const PAGE_PATTERN = /^[1-9]\d*$/;

export function parseLibraryQuery(search: string): {
  query: LibraryQuery;
  isCanonical: boolean;
} {
  const searchParameters = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const rawPage = searchParameters.get('page');

  if (rawPage === null) {
    return { query: { page: DEFAULT_LIBRARY_PAGE }, isCanonical: true };
  }

  if (!PAGE_PATTERN.test(rawPage)) {
    return { query: { page: DEFAULT_LIBRARY_PAGE }, isCanonical: false };
  }

  const page = Number(rawPage);

  return {
    query: { page },
    isCanonical: page !== DEFAULT_LIBRARY_PAGE,
  };
}

export function hrefForLibraryQuery(query: LibraryQuery, currentSearch = ''): string {
  const searchParameters = new URLSearchParams(
    currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch,
  );

  if (query.page <= DEFAULT_LIBRARY_PAGE) {
    searchParameters.delete('page');
  } else {
    searchParameters.set('page', String(query.page));
  }

  const serialized = searchParameters.toString();
  const path = hrefForPage(APP_PAGE.library);
  return serialized === '' ? path : `${path}?${serialized}`;
}
