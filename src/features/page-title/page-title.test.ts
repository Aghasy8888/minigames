// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { createPageTitle } from '.';

function textsOf(section: HTMLElement): (string | null | undefined)[] {
  return [
    section.querySelector('h1')?.textContent,
    section.querySelector('.page-title__subtitle')?.textContent,
  ];
}

describe('page title', () => {
  it('is a section labelled by its heading', () => {
    const section = createPageTitle();
    const heading = section.querySelector('h1');

    expect(section.getAttribute('aria-labelledby')).toBe(heading?.id);
    expect(heading?.id).toBe('page-title-heading');
  });

  it.each([
    {
      name: 'the Library title and subtitle by default',
      options: undefined,
      shown: ['Game Library', 'Browse our collection of casual mini-games'],
    },
    {
      name: 'a custom title with the default subtitle',
      options: { title: 'Favorites' },
      shown: ['Favorites', 'Browse our collection of casual mini-games'],
    },
    {
      name: 'a custom title and subtitle',
      options: { title: 'Favorites', subtitle: 'Games you liked' },
      shown: ['Favorites', 'Games you liked'],
    },
  ])('shows $name', ({ options, shown }) => {
    expect(textsOf(createPageTitle(options))).toStrictEqual(shown);
  });

  it('renders the texts as text, never as markup', () => {
    const section = createPageTitle({ title: '<b>bold</b>', subtitle: '<i>x</i>' });

    expect(section.querySelector('b, i')).toBeNull();
    expect(textsOf(section)).toStrictEqual(['<b>bold</b>', '<i>x</i>']);
  });
});
