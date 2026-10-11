import { describe, expect, it, vi } from 'vitest';

import { hrefWithGame, parseGameQuery } from './game-dialog-query';

describe('parseGameQuery', () => {
  it.each([
    { name: 'an empty search', search: '' },
    { name: 'only Library params', search: '?category=puzzle&page=2' },
  ])('treats $name as canonical with no game', ({ search }) => {
    expect(parseGameQuery(search)).toEqual({ isCanonical: true });
  });

  it.each([
    { name: 'a hyphenated slug', slug: 'puzzle-quest' },
    { name: 'letters and digits', slug: 'game2048' },
    { name: 'a single character', slug: 'a' },
    { name: 'several hyphenated words', slug: 'farm-life-2' },
  ])('reads $name', ({ slug }) => {
    expect(parseGameQuery(`?game=${slug}`)).toEqual({ slug, isCanonical: true });
  });

  it('reads game next to auth (Auth over Game Details)', () => {
    expect(parseGameQuery('?game=puzzle-quest&auth=login')).toEqual({
      slug: 'puzzle-quest',
      isCanonical: true,
    });
  });

  it.each([
    { name: 'an empty value', raw: '' },
    { name: 'uppercase letters', raw: 'Puzzle-Quest' },
    { name: 'a double hyphen', raw: 'puzzle--quest' },
    { name: 'a leading hyphen', raw: '-puzzle' },
    { name: 'a trailing hyphen', raw: 'puzzle-' },
    { name: 'an encoded space', raw: 'puzzle%20quest' },
    { name: 'an underscore', raw: 'puzzle_quest' },
    { name: 'a path traversal', raw: '..%2Fetc' },
    { name: 'encoded markup', raw: '%3Cscript%3E' },
  ])('rejects $name as not canonical without a slug', ({ raw }) => {
    expect(parseGameQuery(`?game=${raw}`)).toEqual({ isCanonical: false });
  });
});

describe('hrefWithGame', () => {
  it('opens a game over the current page and drops auth', () => {
    vi.stubGlobal('location', new URL('http://localhost/library?page=2&auth=login'));

    expect(hrefWithGame('puzzle-quest')).toBe('/library?page=2&game=puzzle-quest');
  });

  it('closes the game and keeps the other params', () => {
    vi.stubGlobal('location', new URL('http://localhost/library?page=2&game=puzzle-quest'));

    expect(hrefWithGame()).toBe('/library?page=2');
  });
});
