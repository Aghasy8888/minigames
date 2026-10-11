// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { dispatchPointer } from '../test-support/pointer-events';
import { useCarousel, type Carousel, type UseCarouselOptions } from './use-carousel';

const AUTOPLAY_MS = 5000;
const TAP_MAX_MS = 300;

let track: HTMLElement;
let card: HTMLElement;
let previousButton: HTMLButtonElement;
let nextButton: HTMLButtonElement;
let onIndexChange: Mock<UseCarouselOptions['onIndexChange']>;
let onTap: Mock<(target: Element) => void>;
let isActive: boolean;
let carousel: Carousel | undefined;

function createCarousel(overrides: Partial<UseCarouselOptions> = {}): Carousel {
  carousel = useCarousel({
    track,
    itemCount: 3,
    previousButton,
    nextButton,
    autoplayMs: AUTOPLAY_MS,
    swipeThresholdPx: 40,
    tapMaxMs: TAP_MAX_MS,
    isActive: () => isActive,
    onIndexChange,
    onTap,
    ...overrides,
  });
  onIndexChange.mockClear();
  return carousel;
}

function indexes(): number[] {
  return onIndexChange.mock.calls.map(([index]) => index);
}

function press(target: Element, heldMs: number, deltaX = 0): void {
  dispatchPointer(target, 'pointerdown', { clientX: 100 });
  vi.advanceTimersByTime(heldMs);
  dispatchPointer(target, 'pointerup', { clientX: 100 + deltaX });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
  track = document.createElement('div');
  card = document.createElement('article');
  track.append(card);
  previousButton = document.createElement('button');
  nextButton = document.createElement('button');
  document.body.append(track, previousButton, nextButton);
  onIndexChange = vi.fn();
  onTap = vi.fn();
  isActive = true;
  carousel = undefined;
});

afterEach(() => {
  carousel?.destroy();
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('useCarousel', () => {
  it('reports the first item without animation on start', () => {
    useCarousel({
      track,
      itemCount: 3,
      previousButton,
      nextButton,
      autoplayMs: AUTOPLAY_MS,
      swipeThresholdPx: 40,
      tapMaxMs: TAP_MAX_MS,
      isActive: () => false,
      onIndexChange,
    }).destroy();

    expect(onIndexChange.mock.calls).toStrictEqual([[0, false]]);
  });

  it('autoplays forward with animation and wraps after the last item', () => {
    createCarousel();

    vi.advanceTimersByTime(AUTOPLAY_MS * 3);

    expect(onIndexChange.mock.calls).toStrictEqual([
      [1, true],
      [2, true],
      [0, true],
    ]);
  });

  it('does not autoplay while inactive', () => {
    isActive = false;
    createCarousel();

    vi.advanceTimersByTime(AUTOPLAY_MS * 3);

    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it('steps forward on Next and restarts the autoplay countdown', () => {
    createCarousel();
    vi.advanceTimersByTime(AUTOPLAY_MS - 1000);

    nextButton.click();
    vi.advanceTimersByTime(AUTOPLAY_MS - 1);

    expect(indexes()).toStrictEqual([1]);
    vi.advanceTimersByTime(1);
    expect(indexes()).toStrictEqual([1, 2]);
  });

  it('steps back on Previous, wraps to the last item, and restarts the countdown', () => {
    createCarousel();
    vi.advanceTimersByTime(AUTOPLAY_MS - 1000);

    previousButton.click();
    vi.advanceTimersByTime(AUTOPLAY_MS - 1);

    expect(onIndexChange.mock.calls).toStrictEqual([[2, true]]);
    vi.advanceTimersByTime(1);
    expect(indexes()).toStrictEqual([2, 0]);
  });

  it.each([
    { name: 'left', deltaX: -60, index: 1 },
    { name: 'right', deltaX: 60, index: 2 },
  ])('steps on a $name swipe and restarts the countdown', ({ deltaX, index }) => {
    createCarousel();
    vi.advanceTimersByTime(AUTOPLAY_MS - 1000);

    press(track, 100, deltaX);
    vi.advanceTimersByTime(AUTOPLAY_MS - 1);

    expect(indexes()).toStrictEqual([index]);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('pauses autoplay while held and resumes the remaining time on release', () => {
    createCarousel();
    vi.advanceTimersByTime(AUTOPLAY_MS - 1000);

    dispatchPointer(track, 'pointerdown');
    vi.advanceTimersByTime(AUTOPLAY_MS * 2);
    expect(onIndexChange).not.toHaveBeenCalled();

    dispatchPointer(track, 'pointerup', { clientX: 0, clientY: 200 });
    vi.advanceTimersByTime(999);
    expect(onIndexChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(indexes()).toStrictEqual([1]);
  });

  it.each([
    { name: 'a quick tap', heldMs: TAP_MAX_MS, taps: 1 },
    { name: 'a long press', heldMs: TAP_MAX_MS + 1, taps: 0 },
  ])('reports the pressed element only for $name', ({ heldMs, taps }) => {
    createCarousel();

    press(card, heldMs);

    expect(onTap.mock.calls).toStrictEqual(Array.from({ length: taps }, () => [card]));
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it('does not report a tap for a short drag that is not a tap', () => {
    createCarousel();

    dispatchPointer(card, 'pointerdown', { clientX: 100, clientY: 100 });
    dispatchPointer(card, 'pointerup', { clientX: 130, clientY: 160 });

    expect(onTap).not.toHaveBeenCalled();
  });

  it('keeps autoplaying after a tap when no tap handler is given', () => {
    createCarousel({ onTap: undefined });

    press(card, 50);
    vi.advanceTimersByTime(AUTOPLAY_MS);

    expect(indexes()).toStrictEqual([1]);
  });

  it('stops autoplay, buttons, and swipes on destroy', () => {
    const created = createCarousel();

    created.destroy();
    vi.advanceTimersByTime(AUTOPLAY_MS * 2);
    nextButton.click();
    previousButton.click();
    press(track, 100, -60);
    press(card, 50);

    expect(onIndexChange).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
  });
});
