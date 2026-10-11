// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LOAD_STATUS } from '../../hooks/use-load-state';
import type { LibraryGamesState } from '../../hooks/use-library-games';
import type { GameListItem, GamesListMeta } from '../../services/games-api-provider';
import { makeGame, makeGamesMeta } from '../../test-support/api-factories';
import {
  fakeLoadController,
  type FakeLoadController,
} from '../../test-support/fake-load-controller';
import { currentUrl } from '../../test-support/history';

vi.mock('../../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { loading, success, empty, error: errorStatus } = LOAD_STATUS;

type Games = FakeLoadController<GameListItem, GamesListMeta>;

let section: HTMLElement;
let games: Games;

async function mount(initial: LibraryGamesState, url = '/library'): Promise<void> {
  globalThis.history.replaceState(undefined, '', url);
  vi.resetModules();
  const { createGameCards } = await import('.');
  games = fakeLoadController(initial);
  section = createGameCards(games);
  document.body.append(section);
}

function content(): HTMLElement {
  const element = section.querySelector<HTMLElement>('.game-cards__content');
  if (!element) {
    throw new Error('missing content');
  }
  return element;
}

function cardTitles(): (string | null)[] {
  return [...section.querySelectorAll('.game-card__title')].map(({ textContent }) => textContent);
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('loading', () => {
  it('shows a busy list of six skeleton cards, one per page slot', async () => {
    await mount({ status: loading });
    const items = [...section.querySelectorAll('.game-cards__list > .game-cards__item')];

    expect(section.getAttribute('aria-label')).toBe('Games');
    expect(content().getAttribute('aria-busy')).toBe('true');
    expect(items).toHaveLength(6);
    expect(
      items.every((item) => item.firstElementChild?.classList.contains('game-card--skeleton')),
    ).toBe(true);
  });
});

describe('success', () => {
  it('lists exactly the games the API returned, in its order', async () => {
    await mount({
      status: success,
      data: [makeGame({ slug: 'b', name: 'Beta' }), makeGame({ slug: 'a', name: 'Alpha' })],
      meta: makeGamesMeta(),
    });

    expect(content().getAttribute('aria-busy')).toBe('false');
    expect(cardTitles()).toStrictEqual(['Beta', 'Alpha']);
    expect(section.querySelectorAll('.game-cards__item > .game-card')).toHaveLength(2);
  });

  it('replaces the skeleton when the games arrive', async () => {
    await mount({ status: loading });

    games.emit({ status: success, data: [makeGame()], meta: makeGamesMeta() });

    expect(section.querySelector('.game-card--skeleton')).toBeNull();
    expect(cardTitles()).toStrictEqual(['Cat Mail Co.']);
  });
});

describe('empty', () => {
  it('explains that there are no games, without an action, when nothing is filtered', async () => {
    await mount({ status: empty }, '/library?sort=name-asc');
    const emptyState = section.querySelector('.empty-state');

    expect(emptyState?.querySelector('.empty-state__title')?.textContent).toBe(
      'No games available',
    );
    expect(emptyState?.querySelector('.empty-state__message')?.textContent).toBe(
      'No games to show right now.',
    );
    expect(emptyState?.querySelector('button')).toBeNull();
    expect(section.querySelector('.error-banner')).toBeNull();
  });

  it('blames the category filter and offers to reset it', async () => {
    await mount({ status: empty }, '/library?category=farm&sort=name-asc');
    const emptyState = section.querySelector('.empty-state');

    expect(emptyState?.querySelector('.empty-state__message')?.textContent).toBe(
      'No games match the selected category.',
    );
    expect(emptyState?.querySelector('button')?.textContent).toBe('Reset filters');
  });

  it('resets only the category, keeping the sort, as a new history entry', async () => {
    await mount({ status: empty }, '/library?category=farm&sort=name-asc');
    const { length } = globalThis.history;

    section.querySelector<HTMLButtonElement>('.empty-state button')?.click();

    expect(currentUrl()).toBe('/library?sort=name-asc');
    expect(globalThis.history.length).toBe(length + 1);
  });
});

describe('error', () => {
  it('shows an error banner whose Retry repeats the request', async () => {
    const retry = vi.fn<() => void>();
    await mount({ status: errorStatus, message: 'Games are unavailable right now.', retry });
    const banner = section.querySelector('.error-banner');

    banner?.querySelector<HTMLButtonElement>('.error-banner__retry')?.click();

    expect(banner?.querySelector('.error-banner__title')?.textContent).toBe('Could not load games');
    expect(banner?.querySelector('.error-banner__message')?.textContent).toBe(
      'Games are unavailable right now.',
    );
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('falls back to a connection hint when the error has no message', async () => {
    await mount({ status: errorStatus, message: '', retry: vi.fn() });

    expect(section.querySelector('.error-banner__message')?.textContent).toBe(
      'Check your connection and try again.',
    );
  });
});

describe('unmounting', () => {
  it('stops following the games once removed from the page', async () => {
    await mount({ status: loading });
    section.remove();
    await Promise.resolve();
    await Promise.resolve();

    games.emit({ status: success, data: [makeGame()], meta: makeGamesMeta() });

    expect(cardTitles()).toStrictEqual([]);
  });
});
