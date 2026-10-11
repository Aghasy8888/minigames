import { describe, expect, it } from 'vitest';

import { resolveGameImage } from './resolve-game-image';

describe('resolveGameImage', () => {
  it('resolves the API card image path to the bundled image of the same file name', () => {
    expect(resolveGameImage('/assets/images/games/cat-mail-co-card.jpg')).toMatch(
      /cat-mail-co-card\.jpg$/,
    );
  });

  it('matches by file name, whatever folder the API path uses', () => {
    expect(resolveGameImage('cat-mail-co-card.jpg')).toBe(
      resolveGameImage('/assets/images/games/cat-mail-co-card.jpg'),
    );
  });

  it.each([
    { name: 'an unknown file', path: '/assets/images/games/missing-game-card.jpg' },
    { name: 'an empty path', path: '' },
    { name: 'a path ending in a slash', path: '/assets/images/games/' },
  ])('returns undefined for $name', ({ path }) => {
    expect(resolveGameImage(path)).toBeUndefined();
  });
});
