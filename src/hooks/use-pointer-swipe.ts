export type SwipeDirection = 'prev' | 'next';

export type PointerSwipeRelease = {
  didSwipe: boolean;
  direction?: SwipeDirection;
  isTap: boolean;
  heldMs: number;
  pressTarget?: EventTarget;
};

export type PointerSwipe = {
  destroy: () => void;
};

export type UsePointerSwipeOptions = {
  thresholdPx: number;
  onHold: () => void;
  onRelease: (result: PointerSwipeRelease) => void;
};

export function usePointerSwipe(
  element: HTMLElement,
  { thresholdPx, onHold, onRelease }: UsePointerSwipeOptions,
): PointerSwipe {
  let pointerId: number | undefined;
  let startX = 0;
  let startY = 0;
  let pressedAt = 0;
  let isHolding = false;
  let pressTarget: EventTarget | undefined;

  function resetPointer(): void {
    pointerId = undefined;
    isHolding = false;
    pressTarget = undefined;
  }

  function onPointerDown(event: PointerEvent): void {
    if (pointerId !== undefined) {
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    pressedAt = performance.now();
    isHolding = true;
    pressTarget = event.target ?? undefined;

    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointer events (and some browsers) reject capture.
    }

    onHold();
  }

  function finishPointer(event: PointerEvent): void {
    if (pointerId !== event.pointerId || !isHolding) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    const isHorizontal = Math.abs(deltaX) >= Math.abs(deltaY);
    const didSwipe = isHorizontal && Math.abs(deltaX) >= thresholdPx;
    const isTap = Math.abs(deltaX) < thresholdPx && Math.abs(deltaY) < thresholdPx;
    const direction: SwipeDirection | undefined = didSwipe
      ? deltaX < 0
        ? 'next'
        : 'prev'
      : undefined;
    const releasedPressTarget = pressTarget;
    const heldMs = performance.now() - pressedAt;

    resetPointer();

    try {
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Capture may not have been granted.
    }

    onRelease({ didSwipe, direction, isTap, heldMs, pressTarget: releasedPressTarget });
  }

  function onPointerCancel(event: PointerEvent): void {
    if (pointerId !== event.pointerId || !isHolding) {
      return;
    }

    const heldMs = performance.now() - pressedAt;

    resetPointer();
    onRelease({ didSwipe: false, isTap: false, heldMs });
  }

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointerup', finishPointer);
  element.addEventListener('pointercancel', onPointerCancel);

  return {
    destroy() {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointerup', finishPointer);
      element.removeEventListener('pointercancel', onPointerCancel);
      resetPointer();
    },
  };
}
