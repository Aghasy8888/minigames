import { describe, expect, it, vi } from 'vitest';

import { AUTH_DIALOG_MODE, hrefWithAuth, parseAuthQuery } from './auth-dialog-query';

const { login, register } = AUTH_DIALOG_MODE;

describe('parseAuthQuery', () => {
  it('treats a URL without auth as canonical with no mode', () => {
    expect(parseAuthQuery('')).toEqual({ isCanonical: true });
    expect(parseAuthQuery('?category=puzzle')).toEqual({ isCanonical: true });
  });

  it.each([login, register])('parses auth=%s', (mode) => {
    expect(parseAuthQuery(`?auth=${mode}`)).toEqual({ mode, isCanonical: true });
  });

  it.each(['admin', '', 'LOGIN'])('marks unknown mode %j as not canonical', (mode) => {
    expect(parseAuthQuery(`?auth=${mode}`)).toEqual({ isCanonical: false });
  });

  it('keeps auth next to game (Auth over Game Details)', () => {
    expect(parseAuthQuery('?game=puzzle-quest&auth=login')).toEqual({
      mode: login,
      isCanonical: true,
    });
  });
});

describe('hrefWithAuth', () => {
  it('adds auth and keeps the path, other params and hash', () => {
    vi.stubGlobal('location', new URL('http://localhost/library?game=puzzle-quest&page=2#top'));

    expect(hrefWithAuth(login)).toBe('/library?game=puzzle-quest&page=2&auth=login#top');
  });

  it('drops only auth when no mode is given', () => {
    vi.stubGlobal('location', new URL('http://localhost/library?game=puzzle-quest&auth=register'));

    expect(hrefWithAuth()).toBe('/library?game=puzzle-quest');
  });

  it('leaves no trailing question mark when auth was the only param', () => {
    vi.stubGlobal('location', new URL('http://localhost/?auth=login'));

    expect(hrefWithAuth()).toBe('/');
  });
});
