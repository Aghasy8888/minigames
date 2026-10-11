import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_GAME_SORT, GAME_CATEGORY_ALL } from '../services/games-types';
import {
  DEFAULT_LIBRARY_QUERY,
  hrefForLibraryQuery,
  isGameCategory,
  isGameSort,
  parseLibraryQuery,
  type LibraryQuery,
} from './library-query';

/** What `URLSearchParams#get` returns for a param that isn't in the URL. */
const MISSING_PARAM = new URLSearchParams().get('category');

function makeQuery(overrides: Partial<LibraryQuery>): LibraryQuery {
  return { ...DEFAULT_LIBRARY_QUERY, ...overrides };
}

beforeEach(() => {
  vi.stubEnv('BASE_URL', '/');
});

describe('isGameCategory', () => {
  it.each(['all', 'puzzle', 'card', 'match', 'farm', 'strategy', 'arcade'])(
    'accepts the spec category %j',
    (value) => {
      expect(isGameCategory(value)).toBe(true);
    },
  );

  it.each([MISSING_PARAM, undefined, '', 'Puzzle', 'racing', 'toString'])('rejects %j', (value) => {
    expect(isGameCategory(value)).toBe(false);
  });
});

describe('isGameSort', () => {
  it.each(['rating-desc', 'rating-asc', 'name-asc', 'name-desc'])(
    'accepts the spec sort %j',
    (value) => {
      expect(isGameSort(value)).toBe(true);
    },
  );

  it.each([MISSING_PARAM, undefined, '', 'rating', 'name-DESC', 'bogus'])('rejects %j', (value) => {
    expect(isGameSort(value)).toBe(false);
  });
});

describe('parseLibraryQuery', () => {
  it('returns the defaults for an empty query', () => {
    expect(parseLibraryQuery('')).toEqual({ query: DEFAULT_LIBRARY_QUERY, isCanonical: true });
  });

  it('reads category, sort, and page together', () => {
    expect(parseLibraryQuery('?category=card&sort=name-desc&page=3')).toEqual({
      query: { page: 3, category: 'card', sort: 'name-desc' },
      isCanonical: true,
    });
  });

  it('accepts a search string without the leading "?"', () => {
    expect(parseLibraryQuery('page=2')).toEqual({
      query: { ...DEFAULT_LIBRARY_QUERY, page: 2 },
      isCanonical: true,
    });
  });

  it('ignores params that are not Library params', () => {
    expect(parseLibraryQuery('?game=puzzle-quest&auth=login')).toEqual({
      query: DEFAULT_LIBRARY_QUERY,
      isCanonical: true,
    });
  });

  it.each([
    { name: 'page=1 (the default must be omitted)', search: '?page=1' },
    { name: 'page=0', search: '?page=0' },
    { name: 'a negative page', search: '?page=-2' },
    { name: 'a non-numeric page', search: '?page=abc' },
    { name: 'a decimal page', search: '?page=2.5' },
    { name: 'a zero-padded page', search: '?page=02' },
    { name: 'an empty page', search: '?page=' },
  ])('falls back to page 1 and flags $name as not canonical', ({ search }) => {
    expect(parseLibraryQuery(search)).toEqual({
      query: DEFAULT_LIBRARY_QUERY,
      isCanonical: false,
    });
  });

  it.each([
    { name: 'an unknown category', search: '?category=racing' },
    { name: 'an empty category', search: '?category=' },
    { name: 'a differently cased category', search: '?category=Puzzle' },
  ])('drops $name and flags it as not canonical', ({ search }) => {
    expect(parseLibraryQuery(search)).toEqual({
      query: DEFAULT_LIBRARY_QUERY,
      isCanonical: false,
    });
  });

  it.each([
    { name: 'an unknown sort', search: '?sort=bogus' },
    { name: 'the default sort written out', search: `?sort=${DEFAULT_GAME_SORT}` },
  ])('uses the default sort for $name and flags it as not canonical', ({ search }) => {
    expect(parseLibraryQuery(search)).toEqual({
      query: DEFAULT_LIBRARY_QUERY,
      isCanonical: false,
    });
  });

  it('keeps the valid params when another one is invalid', () => {
    expect(parseLibraryQuery('?category=puzzle&sort=name-asc&page=abc')).toEqual({
      query: { page: 1, category: 'puzzle', sort: 'name-asc' },
      isCanonical: false,
    });
  });
});

describe('hrefForLibraryQuery', () => {
  it('builds a bare /library URL for the default query', () => {
    expect(hrefForLibraryQuery(DEFAULT_LIBRARY_QUERY)).toBe('/library');
  });

  it('writes category, sort, and page', () => {
    expect(hrefForLibraryQuery(makeQuery({ category: 'puzzle', sort: 'name-asc', page: 2 }))).toBe(
      '/library?category=puzzle&sort=name-asc&page=2',
    );
  });

  it.each([
    { name: 'page 1', overrides: { page: 1 } },
    { name: 'page 0', overrides: { page: 0 } },
    { name: 'the default sort', overrides: { sort: DEFAULT_GAME_SORT } },
    { name: 'no category', overrides: { category: undefined } },
  ])('omits $name', ({ overrides }) => {
    expect(hrefForLibraryQuery(makeQuery(overrides))).toBe('/library');
  });

  it('omits the category that equals the default category', () => {
    expect(
      hrefForLibraryQuery(makeQuery({ category: GAME_CATEGORY_ALL }), '', GAME_CATEGORY_ALL),
    ).toBe('/library');
  });

  it('writes "all" when no default category is given', () => {
    expect(hrefForLibraryQuery(makeQuery({ category: GAME_CATEGORY_ALL }))).toBe(
      '/library?category=all',
    );
  });

  it('replaces the Library params of the current URL', () => {
    expect(
      hrefForLibraryQuery(makeQuery({ category: 'farm' }), '?category=card&sort=name-asc&page=4'),
    ).toBe('/library?category=farm');
  });

  it('keeps the dialog params of the current URL', () => {
    expect(
      hrefForLibraryQuery(makeQuery({ category: 'puzzle' }), '?game=puzzle-quest&auth=login'),
    ).toBe('/library?game=puzzle-quest&auth=login&category=puzzle');
  });

  it('round-trips through parseLibraryQuery as a canonical query', () => {
    const original = makeQuery({ category: 'strategy', sort: 'rating-asc', page: 5 });
    const { search } = new URL(hrefForLibraryQuery(original), 'http://localhost');

    expect(parseLibraryQuery(search)).toEqual({ query: original, isCanonical: true });
  });

  it('prefixes the production base', () => {
    vi.stubEnv('BASE_URL', '/minigames/');

    expect(hrefForLibraryQuery(makeQuery({ page: 2 }))).toBe('/minigames/library?page=2');
  });
});
