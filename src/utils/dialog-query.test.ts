import { describe, expect, it, vi } from 'vitest';

import { AUTH_PARAM, GAME_PARAM, hrefWithDialogParameter } from './dialog-query';

function setLocation(path: string): void {
  vi.stubGlobal('location', new URL(path, 'http://localhost'));
}

describe('hrefWithDialogParameter', () => {
  it('adds game and keeps the path, Library params, and hash', () => {
    setLocation('/library?category=puzzle&page=2#top');

    expect(hrefWithDialogParameter(GAME_PARAM, 'puzzle-quest')).toBe(
      '/library?category=puzzle&page=2&game=puzzle-quest#top',
    );
  });

  it('replaces an existing game instead of adding a second one', () => {
    setLocation('/?game=puzzle-quest');

    expect(hrefWithDialogParameter(GAME_PARAM, 'card-clash')).toBe('/?game=card-clash');
  });

  it('drops auth when game is set', () => {
    setLocation('/library?auth=login');

    expect(hrefWithDialogParameter(GAME_PARAM, 'puzzle-quest')).toBe('/library?game=puzzle-quest');
  });

  it('keeps game when auth is set (Auth over Game Details)', () => {
    setLocation('/library?game=puzzle-quest');

    expect(hrefWithDialogParameter(AUTH_PARAM, 'login')).toBe(
      '/library?game=puzzle-quest&auth=login',
    );
  });

  it('keeps game when switching the auth mode', () => {
    setLocation('/library?game=puzzle-quest&auth=login');

    expect(hrefWithDialogParameter(AUTH_PARAM, 'register')).toBe(
      '/library?game=puzzle-quest&auth=register',
    );
  });

  it('removes only auth and keeps game', () => {
    setLocation('/library?game=puzzle-quest&auth=login#comments');

    expect(hrefWithDialogParameter(AUTH_PARAM)).toBe('/library?game=puzzle-quest#comments');
  });

  it('removes only game and keeps auth and the Library params', () => {
    setLocation('/library?category=card&game=puzzle-quest&auth=register');

    expect(hrefWithDialogParameter(GAME_PARAM)).toBe('/library?category=card&auth=register');
  });

  it('leaves no trailing question mark when the removed param was the only one', () => {
    setLocation('/library?game=puzzle-quest');

    expect(hrefWithDialogParameter(GAME_PARAM)).toBe('/library');
  });

  it('keeps the production base path', () => {
    setLocation('/minigames/library?page=3');

    expect(hrefWithDialogParameter(GAME_PARAM, 'puzzle-quest')).toBe(
      '/minigames/library?page=3&game=puzzle-quest',
    );
  });
});
