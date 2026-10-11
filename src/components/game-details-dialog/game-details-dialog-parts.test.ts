// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeDarkIcon, closeDefaultIcon, starIcon } from '../../assets/icons';
import {
  createCloseButton,
  createHeroMedia,
  createHeroPlaceholder,
  createIconImage,
  createSpecWidget,
  createStat,
} from './game-details-dialog-parts';

const HERO_PATH = '/assets/images/games/cat-mail-co-hero.jpg';
const SKELETON_FADE_MS = 300;

/** happy-dom never loads images; report "still loading" so the test decides how it ends. */
function stubLoadingImages(): void {
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
  vi.spyOn(HTMLImageElement.prototype, 'decode').mockResolvedValue();
}

function heroImageOf(media: HTMLElement): HTMLImageElement | null {
  return media.querySelector<HTMLImageElement>('.game-details-dialog__hero-image');
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('createIconImage', () => {
  it('renders a decorative image with the given class', () => {
    const icon = createIconImage(starIcon, 'game-details-dialog__stat-icon');

    expect(icon.getAttribute('src')).toBe(starIcon);
    expect(icon.alt).toBe('');
    expect(icon.className).toBe('game-details-dialog__stat-icon');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('createCloseButton', () => {
  it('is a labelled button with a default and a hover icon', () => {
    const button = createCloseButton();

    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Close game details');
    expect([...button.querySelectorAll('img')].map((icon) => icon.getAttribute('src'))).toEqual([
      closeDefaultIcon,
      closeDarkIcon,
    ]);
  });
});

describe('createHeroPlaceholder', () => {
  it('is a decorative block', () => {
    const placeholder = createHeroPlaceholder();

    expect(placeholder.className).toBe('game-details-dialog__hero-placeholder');
    expect(placeholder.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('createHeroMedia', () => {
  it('falls back to the placeholder for an image the app does not ship', () => {
    const media = createHeroMedia('/assets/images/games/unknown-game-hero.jpg');

    expect(media.className).toBe('game-details-dialog__hero-placeholder');
  });

  it('falls back to the placeholder for a path without a file name', () => {
    expect(createHeroMedia('/assets/images/games/').className).toBe(
      'game-details-dialog__hero-placeholder',
    );
  });

  it('shows the bundled hero image under a skeleton while it loads', () => {
    stubLoadingImages();

    const media = createHeroMedia(HERO_PATH);
    const image = heroImageOf(media);

    expect(media.className).toBe('game-details-dialog__hero-media');
    expect(image?.getAttribute('src')).toMatch(/cat-mail-co-hero.*\.jpg$/);
    expect(image?.alt).toBe('');
    expect(image?.decoding).toBe('async');
    expect(media.querySelector('.game-details-dialog__hero-skeleton')).not.toBeNull();
  });

  it('fades the skeleton out once the image is ready', async () => {
    stubLoadingImages();
    const media = createHeroMedia(HERO_PATH);
    const skeleton = media.querySelector('.game-details-dialog__hero-skeleton');

    heroImageOf(media)?.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(0);
    expect(skeleton?.classList.contains('skeleton--fade-out')).toBe(true);

    await vi.advanceTimersByTimeAsync(SKELETON_FADE_MS);
    expect(media.querySelector('.game-details-dialog__hero-skeleton')).toBeNull();
    expect(heroImageOf(media)).not.toBeNull();
  });

  it('swaps in the placeholder when the image fails to load', () => {
    stubLoadingImages();
    const media = createHeroMedia(HERO_PATH);

    heroImageOf(media)?.dispatchEvent(new Event('error'));

    expect(heroImageOf(media)).toBeNull();
    expect(media.querySelector('.game-details-dialog__hero-placeholder')).not.toBeNull();
  });
});

describe('createStat', () => {
  it('shows a value next to a decorative icon', () => {
    const stat = createStat(starIcon, '4.9');

    expect(stat.querySelector('.game-details-dialog__stat-value')?.textContent).toBe('4.9');
    expect(stat.querySelector('img')?.getAttribute('src')).toBe(starIcon);
  });
});

describe('createSpecWidget', () => {
  it('shows the spec label and its value as text', () => {
    const widget = createSpecWidget('Genre', '<b>Puzzle</b>');

    expect(widget.querySelector('.game-details-dialog__widget-label')?.textContent).toBe('Genre');
    expect(widget.querySelector('.game-details-dialog__widget-value')?.textContent).toBe(
      '<b>Puzzle</b>',
    );
    expect(widget.querySelector('b')).toBeNull();
  });
});
