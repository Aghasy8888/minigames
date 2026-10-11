import { beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_PAGE, type RoutablePage } from './app-page';
import { hrefForPage, resolvePageFromPath } from './route-path';

const { home, library, notFound } = APP_PAGE;

const ROUTABLE_PAGES: RoutablePage[] = [home, library];

describe('with the dev base "/"', () => {
  beforeEach(() => {
    vi.stubEnv('BASE_URL', '/');
  });

  describe('resolvePageFromPath', () => {
    it.each([
      { name: 'the root', path: '/', expected: home },
      { name: 'an empty path', path: '', expected: home },
      { name: '/home', path: '/home', expected: home },
      { name: '/home with a trailing slash', path: '/home/', expected: home },
      { name: '/library', path: '/library', expected: library },
      { name: '/library with a trailing slash', path: '/library/', expected: library },
      { name: 'repeated outer slashes', path: '//library//', expected: library },
      { name: 'a percent-encoded valid segment', path: '/librar%79', expected: library },
    ])('resolves $name', ({ path, expected }) => {
      expect(resolvePageFromPath(path)).toBe(expected);
    });

    it.each([
      { name: 'an unknown segment', path: '/unknown' },
      { name: 'an invalid route', path: '/invalid-route' },
      { name: 'a nested unknown path', path: '/page/abc' },
      { name: 'a trailing segment after a real page', path: '/library/x' },
      { name: 'two real pages in a row', path: '/home/library' },
      { name: 'a different letter case', path: '/Library' },
      { name: 'a malformed percent encoding', path: '/%E0%A4%A' },
      { name: 'a prototype key', path: '/__proto__' },
      { name: 'a constructor key', path: '/constructor' },
    ])('resolves $name to not-found', ({ path }) => {
      expect(resolvePageFromPath(path)).toBe(notFound);
    });
  });

  describe('hrefForPage', () => {
    it.each([
      { page: home, expected: '/' },
      { page: library, expected: '/library' },
    ])('builds $expected for $page', ({ page, expected }) => {
      expect(hrefForPage(page)).toBe(expected);
    });
  });
});

describe('with the production base "/minigames/"', () => {
  beforeEach(() => {
    vi.stubEnv('BASE_URL', '/minigames/');
  });

  describe('resolvePageFromPath', () => {
    it.each([
      { name: 'the base', path: '/minigames/', expected: home },
      { name: 'the base without a trailing slash', path: '/minigames', expected: home },
      { name: 'home under the base', path: '/minigames/home', expected: home },
      { name: 'library under the base', path: '/minigames/library', expected: library },
    ])('resolves $name', ({ path, expected }) => {
      expect(resolvePageFromPath(path)).toBe(expected);
    });

    it.each([
      { name: 'the site root outside the base', path: '/' },
      { name: 'a real page outside the base', path: '/library' },
      { name: 'a path that only starts with the base name', path: '/minigamesx/library' },
      { name: 'an unknown page under the base', path: '/minigames/unknown' },
      { name: 'the base twice', path: '/minigames/minigames/' },
    ])('resolves $name to not-found', ({ path }) => {
      expect(resolvePageFromPath(path)).toBe(notFound);
    });
  });

  describe('hrefForPage', () => {
    it.each([
      { page: home, expected: '/minigames/' },
      { page: library, expected: '/minigames/library' },
    ])('prefixes the base: $expected for $page', ({ page, expected }) => {
      expect(hrefForPage(page)).toBe(expected);
    });
  });
});

describe.each(['/', '/minigames/'])('round trip with base %s', (base) => {
  beforeEach(() => {
    vi.stubEnv('BASE_URL', base);
  });

  it.each(ROUTABLE_PAGES)('resolves the href built for %s back to the same page', (page) => {
    expect(resolvePageFromPath(hrefForPage(page))).toBe(page);
  });
});
