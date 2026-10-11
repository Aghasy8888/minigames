// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { dispatchPointer } from '../test-support/pointer-events';
import {
  usePointerSwipe,
  type PointerSwipe,
  type PointerSwipeRelease,
  type UsePointerSwipeOptions,
} from './use-pointer-swipe';

const THRESHOLD_PX = 40;
const HELD_MS = 250;

let element: HTMLElement;
let child: HTMLElement;
let onHold: Mock<UsePointerSwipeOptions['onHold']>;
let onRelease: Mock<(result: PointerSwipeRelease) => void>;
let swipe: PointerSwipe;

function pressAndRelease(deltaX: number, deltaY = 0): void {
  dispatchPointer(element, 'pointerdown', { clientX: 100, clientY: 100 });
  vi.advanceTimersByTime(HELD_MS);
  dispatchPointer(element, 'pointerup', { clientX: 100 + deltaX, clientY: 100 + deltaY });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['performance'] });
  element = document.createElement('div');
  child = document.createElement('span');
  element.append(child);
  document.body.append(element);
  onHold = vi.fn();
  onRelease = vi.fn();
  swipe = usePointerSwipe(element, { thresholdPx: THRESHOLD_PX, onHold, onRelease });
});

afterEach(() => {
  swipe.destroy();
  element.remove();
  vi.useRealTimers();
});

describe('usePointerSwipe', () => {
  it('reports a hold and captures the pointer on press', () => {
    const setPointerCapture = vi.spyOn(element, 'setPointerCapture');

    dispatchPointer(element, 'pointerdown', { pointerId: 7 });

    expect(onHold).toHaveBeenCalledOnce();
    expect(setPointerCapture).toHaveBeenCalledExactlyOnceWith(7);
  });

  it('ignores a non-primary mouse button', () => {
    dispatchPointer(element, 'pointerdown', { pointerType: 'mouse', button: 2 });
    dispatchPointer(element, 'pointerup', { pointerType: 'mouse', button: 2 });

    expect(onHold).not.toHaveBeenCalled();
    expect(onRelease).not.toHaveBeenCalled();
  });

  it('accepts a primary mouse button press', () => {
    dispatchPointer(element, 'pointerdown', { pointerType: 'mouse', button: 0 });

    expect(onHold).toHaveBeenCalledOnce();
  });

  it.each([
    {
      name: 'a left swipe',
      deltaX: -60,
      deltaY: 0,
      didSwipe: true,
      direction: 'next',
      isTap: false,
    },
    {
      name: 'a right swipe',
      deltaX: 60,
      deltaY: 0,
      didSwipe: true,
      direction: 'prev',
      isTap: false,
    },
    {
      name: 'a swipe of exactly the threshold',
      deltaX: -40,
      deltaY: 0,
      didSwipe: true,
      direction: 'next',
      isTap: false,
    },
    {
      name: 'a diagonal swipe',
      deltaX: 50,
      deltaY: 50,
      didSwipe: true,
      direction: 'prev',
      isTap: false,
    },
    {
      name: 'a vertical drag',
      deltaX: 50,
      deltaY: 80,
      didSwipe: false,
      direction: undefined,
      isTap: false,
    },
    {
      name: 'a straight vertical drag',
      deltaX: 0,
      deltaY: 80,
      didSwipe: false,
      direction: undefined,
      isTap: false,
    },
    {
      name: 'a short horizontal move',
      deltaX: 39,
      deltaY: 0,
      didSwipe: false,
      direction: undefined,
      isTap: true,
    },
    {
      name: 'a short vertical move',
      deltaX: 0,
      deltaY: -39,
      didSwipe: false,
      direction: undefined,
      isTap: true,
    },
    {
      name: 'a still press',
      deltaX: 0,
      deltaY: 0,
      didSwipe: false,
      direction: undefined,
      isTap: true,
    },
  ])('classifies $name', ({ deltaX, deltaY, didSwipe, direction, isTap }) => {
    pressAndRelease(deltaX, deltaY);

    expect(onRelease).toHaveBeenCalledExactlyOnceWith({
      didSwipe,
      direction,
      isTap,
      heldMs: HELD_MS,
      pressTarget: element,
    });
  });

  it('reports the element the press started on', () => {
    dispatchPointer(child, 'pointerdown');
    dispatchPointer(element, 'pointerup');

    expect(onRelease.mock.calls[0]?.[0].pressTarget).toBe(child);
  });

  it.each([
    { name: 'releases a granted capture', hasCapture: true, releases: 1 },
    { name: 'skips releasing a capture it never got', hasCapture: false, releases: 0 },
  ])('$name', ({ hasCapture, releases }) => {
    vi.spyOn(element, 'hasPointerCapture').mockReturnValue(hasCapture);
    const releasePointerCapture = vi.spyOn(element, 'releasePointerCapture');

    dispatchPointer(element, 'pointerdown', { pointerId: 4 });
    dispatchPointer(element, 'pointerup', { pointerId: 4 });

    expect(releasePointerCapture).toHaveBeenCalledTimes(releases);
    expect(onRelease).toHaveBeenCalledOnce();
  });

  it('still reports press and release when pointer capture throws', () => {
    vi.spyOn(element, 'setPointerCapture').mockImplementation(() => {
      throw new DOMException('Synthetic pointer', 'NotFoundError');
    });
    vi.spyOn(element, 'hasPointerCapture').mockImplementation(() => {
      throw new DOMException('Synthetic pointer', 'NotFoundError');
    });

    pressAndRelease(-60);

    expect(onHold).toHaveBeenCalledOnce();
    expect(onRelease).toHaveBeenCalledOnce();
  });

  it('follows only the first pointer while it is held', () => {
    dispatchPointer(element, 'pointerdown', { pointerId: 1 });
    dispatchPointer(element, 'pointerdown', { pointerId: 2 });
    dispatchPointer(element, 'pointerup', { pointerId: 2 });

    expect(onHold).toHaveBeenCalledOnce();
    expect(onRelease).not.toHaveBeenCalled();

    dispatchPointer(element, 'pointerup', { pointerId: 1 });

    expect(onRelease).toHaveBeenCalledOnce();
  });

  it('ignores a release without a press', () => {
    dispatchPointer(element, 'pointerup');

    expect(onRelease).not.toHaveBeenCalled();
  });

  it('starts a new press after a release', () => {
    pressAndRelease(-60);
    pressAndRelease(60);

    expect(onHold).toHaveBeenCalledTimes(2);
    expect(onRelease).toHaveBeenCalledTimes(2);
  });

  it('reports a cancelled press as neither a swipe nor a tap, then ignores its release', () => {
    dispatchPointer(element, 'pointerdown', { clientX: 100 });
    vi.advanceTimersByTime(HELD_MS);

    dispatchPointer(element, 'pointercancel', { clientX: 0 });
    dispatchPointer(element, 'pointerup', { clientX: 0 });

    expect(onRelease).toHaveBeenCalledExactlyOnceWith({
      didSwipe: false,
      isTap: false,
      heldMs: HELD_MS,
    });
  });

  it('ignores a cancel from another pointer', () => {
    dispatchPointer(element, 'pointerdown', { pointerId: 1 });

    dispatchPointer(element, 'pointercancel', { pointerId: 2 });

    expect(onRelease).not.toHaveBeenCalled();
  });

  it('ignores a cancel without a press', () => {
    dispatchPointer(element, 'pointercancel');

    expect(onRelease).not.toHaveBeenCalled();
  });

  it('stops listening and forgets a held press on destroy', () => {
    dispatchPointer(element, 'pointerdown');

    swipe.destroy();
    dispatchPointer(element, 'pointerup');
    dispatchPointer(element, 'pointercancel');
    dispatchPointer(element, 'pointerdown');

    expect(onHold).toHaveBeenCalledOnce();
    expect(onRelease).not.toHaveBeenCalled();
  });
});
