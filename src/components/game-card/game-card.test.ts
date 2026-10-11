// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { favoriteIcon, starIcon } from '../../assets/icons';
import { makeGame } from '../../test-support/api-factories';
import { currentUrl } from '../../test-support/history';
import { createGameCard, createGameCardSkeleton } from '.';

vi.mock('../../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const START_URL = '/library?category=puzzle';
const SKELETON_FADE_MS = 300;

let card: HTMLElement;

function mount(overrides: Parameters<typeof makeGame>[0] = {}): void {
  card = createGameCard(makeGame(overrides));
  document.body.append(card);
}

function query<T extends Element>(selector: string): T {
  const element = card.querySelector<T>(selector);
  if (!element) {
    throw new Error(`missing element: ${selector}`);
  }
  return element;
}

function texts(selector: string): (string | null)[] {
  return [...card.querySelectorAll(selector)].map(({ textContent }) => textContent);
}

/** happy-dom reports images as already complete with no size, which the card treats as broken. */
function stubLoadingImages(): void {
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
  vi.spyOn(HTMLImageElement.prototype, 'decode').mockResolvedValue();
}

beforeEach(() => {
  vi.useFakeTimers();
  globalThis.history.replaceState(undefined, '', START_URL);
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('content', () => {
  it('is an article named after the game, with title, category badge, and description', () => {
    mount();

    expect(card.tagName).toBe('ARTICLE');
    expect(card.getAttribute('aria-label')).toBe('Cat Mail Co.');
    expect(query('h2.game-card__title').textContent).toBe('Cat Mail Co.');
    expect(query('.game-card__badge').textContent).toBe('Puzzle');
    expect(query('.game-card__description').textContent).toBe('Run a cozy cat post office.');
  });

  it.each([
    {
      name: 'a fractional rating and a compact like count',
      rating: 4.9,
      likesCount: 38_207,
      shown: ['4.9', '38.2K'],
    },
    { name: 'a whole rating with one decimal', rating: 4, likesCount: 999, shown: ['4.0', '999'] },
  ])('shows $name', ({ rating, likesCount, shown }) => {
    mount({ rating, likesCount });

    expect(texts('.game-card__stat-value')).toStrictEqual(shown);
  });

  it('marks the rating and likes icons as decorative', () => {
    mount();
    const icons = [...card.querySelectorAll<HTMLImageElement>('.game-card__stat-icon')];

    expect(icons.map((icon) => icon.getAttribute('src'))).toStrictEqual([starIcon, favoriteIcon]);
    expect(
      icons.map((icon) => [icon.getAttribute('alt'), icon.getAttribute('aria-hidden')]),
    ).toStrictEqual([
      ['', 'true'],
      ['', 'true'],
    ]);
  });

  it.each([
    { name: 'Free', price: 'Free', modifier: 'game-card__price--free' },
    { name: 'free in any letter case', price: 'FREE', modifier: 'game-card__price--free' },
    { name: 'a paid price', price: '$4.99', modifier: 'game-card__price--paid' },
  ])('styles $name in both the header and the mobile price', ({ price, modifier }) => {
    mount({ price });
    const prices = [...card.querySelectorAll('.game-card__price')];

    expect(prices.map(({ className }) => className)).toStrictEqual([
      `game-card__price ${modifier} game-card__price--header`,
      `game-card__price ${modifier} game-card__price--mobile`,
    ]);
    expect(prices.map(({ textContent }) => textContent)).toStrictEqual([price, price]);
  });

  it('renders API text as text, never as markup', () => {
    mount({ name: '<img src=x>', shortDescription: '<b>bold</b>' });

    expect(card.querySelector('img[src="x"], b')).toBeNull();
    expect(query('.game-card__title').textContent).toBe('<img src=x>');
  });
});

describe('Details button', () => {
  it('opens Game Details for this game as a new history entry, keeping the Library query', () => {
    mount({ slug: 'cozy-solitaire' });
    const { length } = globalThis.history;

    query<HTMLButtonElement>('.game-card__details').click();

    expect(currentUrl()).toBe(`${START_URL}&game=cozy-solitaire`);
    expect(globalThis.history.length).toBe(length + 1);
  });

  it('is labelled Details', () => {
    mount();

    expect(query('.game-card__details').getAttribute('aria-label')).toBe('Details');
  });
});

describe('cover image', () => {
  it('shows a decorative placeholder when the image is unknown', () => {
    stubLoadingImages();
    mount({ cardImage: '/assets/images/games/missing.jpg' });

    expect(query('.game-card__placeholder').getAttribute('aria-hidden')).toBe('true');
    expect(card.querySelector('.game-card__image')).toBeNull();
    expect(card.querySelector('.game-card__image-skeleton')).toBeNull();
  });

  it('loads the bundled image under a skeleton', () => {
    stubLoadingImages();
    mount();
    const image = query<HTMLImageElement>('.game-card__image');

    expect(image.getAttribute('src')).toMatch(/cat-mail-co-card.*\.jpg$/);
    expect(image.getAttribute('alt')).toBe('');
    expect(image.decoding).toBe('async');
    expect(card.querySelector('.game-card__image-skeleton')).not.toBeNull();
  });

  it('fades the skeleton out once the image is ready', async () => {
    stubLoadingImages();
    mount();

    query('.game-card__image').dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(0);
    expect(query('.game-card__image-skeleton').classList.contains('skeleton--fade-out')).toBe(true);

    await vi.advanceTimersByTimeAsync(SKELETON_FADE_MS);
    expect(card.querySelector('.game-card__image-skeleton')).toBeNull();
    expect(card.querySelector('.game-card__image')).not.toBeNull();
  });

  it('swaps a broken image and its skeleton for the placeholder', () => {
    stubLoadingImages();
    mount();

    query('.game-card__image').dispatchEvent(new Event('error'));

    expect(card.querySelector('.game-card__image')).toBeNull();
    expect(card.querySelector('.game-card__image-skeleton')).toBeNull();
    expect(card.querySelector('.game-card__media > .game-card__placeholder')).not.toBeNull();
  });
});

describe('skeleton card', () => {
  it('mirrors the card layout and is hidden from screen readers', () => {
    card = createGameCardSkeleton();

    expect(card.className).toBe('game-card game-card--skeleton');
    expect(card.getAttribute('aria-hidden')).toBe('true');
    expect(
      [...card.querySelectorAll('.skeleton')].map(({ className }) =>
        className.replace(/^.*game-card__skeleton--/, ''),
      ),
    ).toStrictEqual(['image', 'title', 'description', 'footer']);
    expect(card.querySelector('.game-card__media > .skeleton')).not.toBeNull();
  });
});
